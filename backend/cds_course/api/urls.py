from django.urls import include, path

urlpatterns = [
    path('accounts/', include('users.urls')),
    path('user-roles/', include('user_roles.urls')),
    path('tags/', include('tags.urls')),
    path('questions/', include('questions.urls')),
    path('question-tags/', include('question_tags.urls')),
    path('answers/', include('answers.urls')),
    path('votes/', include('votes.urls')),
    path('code-snippets/', include('code_snippets.urls')),
    path('snippet-tags/', include('snippet_tags.urls')),
    path('bookmarks/', include('bookmarks.urls')),
    path('notifications/', include('notifications.urls')),
    path('courses/', include('courses.urls')),
    path('course-modules/', include('course_modules.urls')),
    path('lessons/', include('lessons.urls')),
    path('course-progress/', include('user_course_progress.urls')),
    path('quiz-attempts/', include('user_quiz_attempts.urls')),
    path('challenge-completions/', include('user_challenge_completions.urls')),
    path('lesson-notes/', include('user_lesson_notes.urls')),
    path('course-reviews/', include('course_reviews.urls')),
    path('course-certificates/', include('course_certificates.urls')),
]