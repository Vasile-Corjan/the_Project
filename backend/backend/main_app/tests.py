import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Project, ProjectFiles

User = get_user_model()


class ProjectFileAccessRegressionTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._temp_media_root = tempfile.mkdtemp(prefix="test-media-")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls._temp_media_root, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self._media_override = override_settings(MEDIA_ROOT=self._temp_media_root)
        self._media_override.enable()
        self.addCleanup(self._media_override.disable)

        self.owner = User.objects.create_user(
            username="owner",
            password="testpassword123",
        )
        self.non_owner = User.objects.create_user(
            username="nonowner",
            password="testpassword123",
        )

        self.project = Project.objects.create(
            name="Test Project",
            owner=self.owner,
        )

        self.project_file = self._create_project_file(
            filename="test_document.pdf",
            content=b"%PDF-1.4 test document",
            file_type="pdf",
        )

    def _authenticate_with_jwt(self, username, password):
        login_response = self.client.post(
            "/api/signin/",
            {"username": username, "password": password},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

    def _create_project_file(self, filename, content, file_type):
        uploaded_file = SimpleUploadedFile(
            filename,
            content,
            content_type="application/octet-stream",
        )
        return ProjectFiles.objects.create(
            project=self.project,
            filename=filename.rsplit(".", 1)[0],
            file=uploaded_file,
            file_type=file_type,
            size=len(content),
            uploaded_by=self.owner,
        )

    def test_owner_can_list_own_project_files(self):
        self._authenticate_with_jwt("owner", "testpassword123")

        response = self.client.get(f"/api/projects/{self.project.id}/files/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.project_file.id)

    def test_owner_can_download_own_project_file(self):
        self._authenticate_with_jwt("owner", "testpassword123")

        response = self.client.get(
            f"/api/projects/{self.project.id}/files/{self.project_file.id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Content-Disposition", response)

    def test_non_owner_gets_404_when_listing_other_user_files(self):
        self._authenticate_with_jwt("nonowner", "testpassword123")

        response = self.client.get(f"/api/projects/{self.project.id}/files/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_owner_gets_404_when_downloading_other_user_file(self):
        self._authenticate_with_jwt("nonowner", "testpassword123")

        response = self.client.get(
            f"/api/projects/{self.project.id}/files/{self.project_file.id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_upload_multipart_and_fetch_uploaded_file(self):
        self._authenticate_with_jwt("owner", "testpassword123")

        for filename, content in [
            ("viewer-model.ifc", b"ISO-10303-21; HEADER; ENDSEC;"),
            ("spec-sheet.pdf", b"%PDF-1.4 example"),
        ]:
            with self.subTest(filename=filename):
                upload_file = SimpleUploadedFile(
                    filename,
                    content,
                    content_type="application/octet-stream",
                )
                upload_response = self.client.post(
                    f"/api/projects/{self.project.id}/files/",
                    {"file": upload_file},
                    format="multipart",
                )

                self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
                uploaded_file_id = upload_response.data["id"]

                fetch_response = self.client.get(
                    f"/api/projects/{self.project.id}/files/{uploaded_file_id}/"
                )
                self.assertEqual(fetch_response.status_code, status.HTTP_200_OK)