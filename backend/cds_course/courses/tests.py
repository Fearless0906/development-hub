from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from course_modules.models import CourseModule
from lessons.models import Lesson
from .models import Course

User = get_user_model()


class CourseDeleteTests(APITestCase):
    def test_delete_uuid_course_cascades_to_modules_and_lessons(self):
        user = User.objects.create_user(email="admin@example.com", password="password123")
        self.client.force_authenticate(user)
        course = Course.objects.create(title="Django", slug="django")
        module = CourseModule.objects.create(course=course, title="Introduction")
        lesson = Lesson.objects.create(module=module, title="Getting started")

        response = self.client.delete(reverse("course-detail", args=[course.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Course.objects.filter(id=course.id).exists())
        self.assertFalse(CourseModule.objects.filter(id=module.id).exists())
        self.assertFalse(Lesson.objects.filter(id=lesson.id).exists())
