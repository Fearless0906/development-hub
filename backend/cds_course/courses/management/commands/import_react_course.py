import html
import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from course_modules.models import CourseModule
from courses.models import Course
from lessons.models import Lesson


MODULE_HEADING = re.compile(r"^## (Module \d+\..+)$", re.MULTILINE)


def quiz_question(number, question, options, correct, explanation, multiple=False):
    return {
        "id": f"q{number}",
        "question": question,
        "options": options,
        "correctAnswer": correct[0],
        "correctAnswers": correct,
        "type": "multiple" if multiple else "single",
        "explanation": explanation,
    }


QUIZZES = [
    [
        quiz_question(1, "Which tool provides npm?", ["Git", "Node.js", "VS Code", "Vite"], [1], "Installing Node.js also installs npm."),
        quiz_question(2, "Why is Git used during the course?", ["To style pages", "To run React", "To save versions and recover from mistakes", "To validate API data"], [2], "Git records working versions of the project and makes recovery easier."),
        quiz_question(3, "Which Node.js release is recommended?", ["Nightly", "LTS", "The oldest release", "Any browser extension"], [1], "The guide recommends the stable Long-Term Support (LTS) release."),
        quiz_question(4, "Which commands verify the required command-line tools?", ["node -v", "npm -v", "git --version", "vite --check"], [0, 1, 2], "The first three commands verify Node.js, npm, and Git.", True),
    ],
    [
        quiz_question(1, "Which Vite template creates a React TypeScript app?", ["react", "react-ts", "typescript-only", "django-react"], [1], "The react-ts template configures both React and TypeScript."),
        quiz_question(2, "What is the main job of Vite?", ["Store database records", "Run the dev server and build the frontend", "Validate Zod schemas", "Manage Git commits"], [1], "Vite serves the app during development and prepares production builds."),
        quiz_question(3, "What is the React entry file in the generated project?", ["package.json", "index.html", "src/main.tsx", "vite.config.ts"], [2], "src/main.tsx mounts React into the root HTML element."),
        quiz_question(4, "What does npm run dev do?", ["Deletes dependencies", "Starts the Vite development server", "Creates a Django API", "Publishes to production"], [1], "It starts Vite's local development server with file watching."),
    ],
    [
        quiz_question(1, "Which package provides client-side page navigation?", ["axios", "zod", "react-router-dom", "tailwindcss"], [2], "React Router DOM handles navigation and routes in the browser."),
        quiz_question(2, "What is shadcn/ui primarily used for?", ["Database migrations", "Reusable UI components", "API authentication", "Git hosting"], [1], "shadcn/ui adds reusable, customizable interface components."),
        quiz_question(3, "Where are global Tailwind directives or imports placed?", ["src/index.css", "package.json", "index.html only", "manage.py"], [0], "The global stylesheet is loaded once and contains the Tailwind setup."),
        quiz_question(4, "Which packages support API requests and response validation?", ["Axios", "Zod", "Git", "VS Code"], [0, 1], "Axios sends HTTP requests, while Zod validates returned data.", True),
    ],
    [
        quiz_question(1, "What does a feature-based structure group together?", ["Files by extension only", "Code belonging to the same feature", "All components in one file", "Only test files"], [1], "Types, services, hooks, and components stay close to their feature."),
        quiz_question(2, "Where should API request functions normally live?", ["services", "components", "assets", "styles"], [0], "Service files isolate communication with the backend."),
        quiz_question(3, "What is a custom hook responsible for in this architecture?", ["Writing HTML files", "Connecting reusable React/query behavior", "Running Django migrations", "Installing Node.js"], [1], "Hooks package reusable React behavior and connect services to components."),
        quiz_question(4, "Which are benefits of feature-based organization?", ["Easier navigation", "Less duplication", "Clearer ownership", "No need for imports"], [0, 1, 2], "Feature grouping improves navigation, reuse, and ownership, but imports are still required.", True),
    ],
    [
        quiz_question(1, "What does the @ alias commonly point to?", ["The backend", "The src directory", "node_modules", "The public URL"], [1], "The alias shortens imports from the frontend src directory."),
        quiz_question(2, "Which component enables route matching in the app?", ["RouterProvider", "QueryClient", "Axios", "Zod"], [0], "RouterProvider connects the route configuration to React."),
        quiz_question(3, "Why is QueryClientProvider placed near the app root?", ["To style every page", "To make server-state queries available throughout the app", "To compile TypeScript", "To start Django"], [1], "The provider shares one QueryClient with all descendant components."),
        quiz_question(4, "Which files participate in the startup flow?", ["index.html", "src/main.tsx", "router configuration", "db.sqlite3"], [0, 1, 2], "The browser loads index.html, main.tsx mounts React, and the router selects the page.", True),
    ],
    [
        quiz_question(1, "What should an Axios baseURL contain?", ["The common backend API prefix", "A Tailwind class", "A React component", "A Zod error"], [0], "A base URL prevents repeating the backend API prefix for every request."),
        quiz_question(2, "Why validate API responses with Zod?", ["To make HTTP faster", "To confirm runtime data matches the expected shape", "To replace TypeScript", "To create routes"], [1], "TypeScript cannot verify runtime data; Zod can parse and validate it."),
        quiz_question(3, "What does TanStack Query manage?", ["Server data loading and caching", "CSS compilation only", "Database schema migrations", "Editor extensions"], [0], "TanStack Query manages asynchronous server state, caching, and request status."),
        quiz_question(4, "Which UI states should a data query render?", ["Loading", "Error", "Empty", "Success"], [0, 1, 2, 3], "A reliable page explicitly handles every request outcome.", True),
    ],
    [
        quiz_question(1, "What is the recommended feature-building order?", ["Component, schema, service, hook", "Type/schema, service, hook, component/page", "CSS, database, Git, router", "Hook, HTML, backend, type"], [1], "Defining data first makes every following layer easier to type and test."),
        quiz_question(2, "Which hook is used to create or change server data?", ["useQuery", "useMutation", "useState only", "useMemo"], [1], "useMutation represents create, update, and delete operations."),
        quiz_question(3, "Why invalidate a query after a successful mutation?", ["To delete React", "To refresh cached server data", "To disable the API", "To clear browser CSS"], [1], "Invalidation tells TanStack Query that matching cached data is stale."),
        quiz_question(4, "Which values are client state rather than server state?", ["Whether a dialog is open", "The current input text", "Patients returned by the API", "The selected tab"], [0, 1, 3], "Temporary UI choices are client state; API records are server state.", True),
    ],
    [
        quiz_question(1, "What should you check first when debugging?", ["The first useful error message", "Random files", "Production deployment", "A different framework"], [0], "Reading the first relevant terminal or browser error usually reveals the root cause."),
        quiz_question(2, "What commonly causes a browser CORS error?", ["The backend has not allowed the frontend origin", "A missing Tailwind class", "Too many Git commits", "A Zod schema is correct"], [0], "The API must explicitly allow requests from the frontend development origin."),
        quiz_question(3, "What does a 404 response usually indicate?", ["The requested endpoint or URL is wrong", "The user is authenticated", "CSS failed", "Node.js is missing"], [0], "404 means the requested resource or route was not found."),
        quiz_question(4, "Which steps belong to a reliable debugging process?", ["Reproduce the problem", "Read the complete error", "Change one thing at a time", "Verify the fix"], [0, 1, 2, 3], "A controlled loop makes the cause and the successful fix clear.", True),
    ],
]


def quiz_for_module(index):
    return {
        "questions": QUIZZES[index],
        "passScore": 75,
        "unlimitedAttempts": True,
        "reviewAnswers": True,
    }


def render_inline(value: str) -> str:
    """Render the small Markdown subset used by the supplied course."""
    placeholders: list[str] = []

    def protect(markup: str) -> str:
        placeholders.append(markup)
        return f"\x00{len(placeholders) - 1}\x00"

    value = html.escape(value, quote=False)
    value = re.sub(
        r"`([^`]+)`",
        lambda match: protect(f"<code>{match.group(1)}</code>"),
        value,
    )
    value = re.sub(
        r"\[([^]]+)]\((https?://[^)]+)\)",
        lambda match: protect(
            f'<a href="{html.escape(match.group(2), quote=True)}" '
            f'target="_blank" rel="noopener noreferrer">{match.group(1)}</a>'
        ),
        value,
    )
    value = re.sub(r"(?<![\w\"'=])(https?://[^\s<]+)", lambda match: protect(
        f'<a href="{html.escape(match.group(1), quote=True)}" target="_blank" '
        f'rel="noopener noreferrer">{match.group(1)}</a>'
    ), value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", value)
    for index, markup in enumerate(placeholders):
        value = value.replace(f"\x00{index}\x00", markup)
    return value


def markdown_to_html(markdown: str) -> str:
    """Convert course Markdown to viewer-safe HTML without dropping any lines."""
    output: list[str] = []
    paragraph: list[str] = []
    list_type: str | None = None
    quote: list[str] = []
    code: list[str] | None = None
    code_language = ""

    def flush_paragraph() -> None:
        if paragraph:
            output.append(f"<p>{render_inline(' '.join(paragraph))}</p>")
            paragraph.clear()

    def close_list() -> None:
        nonlocal list_type
        if list_type:
            output.append(f"</{list_type}>")
            list_type = None

    def flush_quote() -> None:
        if quote:
            output.append(f"<blockquote><p>{render_inline(' '.join(quote))}</p></blockquote>")
            quote.clear()

    for line in markdown.strip().splitlines():
        fence = re.match(r"^```([\w-]*)\s*$", line)
        if fence:
            flush_paragraph()
            close_list()
            flush_quote()
            if code is None:
                code = []
                code_language = fence.group(1)
            else:
                class_name = f' class="language-{html.escape(code_language)}"' if code_language else ""
                output.append(f"<pre><code{class_name}>{html.escape(chr(10).join(code))}</code></pre>")
                code = None
                code_language = ""
            continue
        if code is not None:
            code.append(line)
            continue
        if not line.strip():
            flush_paragraph()
            close_list()
            flush_quote()
            continue
        heading = re.match(r"^(#{1,6})\s+(.+)$", line)
        if heading:
            flush_paragraph()
            close_list()
            flush_quote()
            level = len(heading.group(1))
            output.append(f"<h{level}>{render_inline(heading.group(2))}</h{level}>")
            continue
        item = re.match(r"^\s*[-*]\s+(.+)$", line)
        numbered = re.match(r"^\s*\d+\.\s+(.+)$", line)
        if item or numbered:
            flush_paragraph()
            flush_quote()
            desired = "ul" if item else "ol"
            if list_type != desired:
                close_list()
                list_type = desired
                output.append(f"<{list_type}>")
            output.append(f"<li>{render_inline((item or numbered).group(1))}</li>")
            continue
        if line.startswith(">"):
            flush_paragraph()
            close_list()
            quote.append(line[1:].strip())
            continue
        close_list()
        flush_quote()
        paragraph.append(line.strip())

    flush_paragraph()
    close_list()
    flush_quote()
    if code is not None:
        output.append(f"<pre><code>{html.escape(chr(10).join(code))}</code></pre>")
    return "".join(output)


class Command(BaseCommand):
    help = "Import or refresh the complete React Crash Course from its Markdown file."

    def add_arguments(self, parser):
        parser.add_argument("source", type=Path, help="Path to the React course Markdown file")

    @transaction.atomic
    def handle(self, *args, **options):
        source: Path = options["source"]
        if not source.is_file():
            raise CommandError(f"Course source does not exist: {source}")

        text = source.read_text(encoding="utf-8")
        matches = list(MODULE_HEADING.finditer(text))
        if len(matches) != 8:
            raise CommandError(f"Expected 8 modules, found {len(matches)}; no data was changed.")

        course, _ = Course.objects.update_or_create(
            slug="react-crash-course",
            defaults={
                "title": "React Crash Course",
                "description": (
                    "A complete, beginner-friendly React course organized by module. "
                    "Build a healthcare dashboard with Vite, TypeScript, Tailwind CSS, "
                    "shadcn/ui, React Router, Axios, Zod, and TanStack Query."
                ),
                "level": Course.Level.BEGINNER,
                "duration": "8 modules",
                "icon": "Code",
                "topics": [
                    "React", "Vite", "TypeScript", "Tailwind CSS", "shadcn/ui",
                    "Zod", "TanStack Query", "React Router DOM", "Axios",
                ],
                "learn_outcomes": [
                    "Navigate between pages without refreshing the browser",
                    "Request and validate data from a Django REST API",
                    "Handle loading, success, empty, and error states",
                    "Build reusable components and feature-based modules",
                    "Cache server data and refresh it after mutations",
                ],
                "prerequisites": [
                    "Basic HTML elements", "JavaScript variables, functions, arrays, and objects",
                    "JavaScript async/await", "Importing and exporting files",
                ],
                "projects_included": ["Healthcare dashboard"],
                "is_progressive": True,
                "is_published": True,
            },
        )
        overview, _ = CourseModule.objects.update_or_create(
            course=course,
            order_index=0,
            defaults={"title": "Complete React Crash Course", "is_published": True},
        )

        imported_titles = []
        for index, match in enumerate(matches):
            end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
            title = match.group(1).strip()
            body = text[match.end():end].strip()
            Lesson.objects.update_or_create(
                module=overview,
                order_index=index,
                defaults={
                    "title": title,
                    "content": markdown_to_html(body),
                    "duration": "Self-paced",
                    "quiz": quiz_for_module(index),
                    "completion_rule": Lesson.CompletionRule.QUIZ,
                    "is_published": True,
                },
            )
            imported_titles.append(title)

        overview.lessons.exclude(order_index__range=(0, len(matches) - 1)).delete()
        self.stdout.write(self.style.SUCCESS(
            f"Imported {len(imported_titles)} complete lessons with "
            f"{sum(len(quiz) for quiz in QUIZZES)} quiz questions into '{course.title}'."
        ))
