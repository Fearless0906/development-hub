from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from answers.models import Answer
from code_snippets.models import CodeSnippet
from questions.models import Question
from votes.models import Vote


User = get_user_model()


def get_user_achievement_totals(user_id):
    if not user_id:
        return {"questions_count": 0, "answers_count": 0, "reputation": 0}

    questions = Question.objects.filter(user_id=user_id)
    answers = Answer.objects.filter(user_id=user_id)
    question_votes = questions.aggregate(total=Sum("votes_count"))["total"] or 0
    answer_votes = answers.aggregate(total=Sum("votes_count"))["total"] or 0
    accepted_answers = answers.filter(is_accepted=True).count()
    reputation = max(
        0,
        question_votes * 5 + answer_votes * 10 + accepted_answers * 15,
    )

    return {
        "questions_count": questions.count(),
        "answers_count": answers.count(),
        "reputation": reputation,
    }


def update_user_achievements(user_id):
    if not user_id:
        return

    User.objects.filter(id=user_id).update(**get_user_achievement_totals(user_id))


def update_question_answer_count(question_id):
    if question_id:
        Question.objects.filter(id=question_id).update(
            answers_count=Answer.objects.filter(question_id=question_id).count(),
        )


def update_vote_target(voteable_type, voteable_id):
    model = {
        Vote.VoteableType.QUESTION: Question,
        Vote.VoteableType.ANSWER: Answer,
        Vote.VoteableType.SNIPPET: CodeSnippet,
    }.get(voteable_type)
    if model is None:
        return

    target = model.objects.filter(id=voteable_id).first()
    if target is None:
        return

    total = (
        Vote.objects.filter(
            voteable_type=voteable_type,
            voteable_id=voteable_id,
        ).aggregate(total=Sum("value"))["total"]
        or 0
    )
    model.objects.filter(id=voteable_id).update(votes_count=total)

    if voteable_type in (Vote.VoteableType.QUESTION, Vote.VoteableType.ANSWER):
        update_user_achievements(target.user_id)


@receiver([post_save, post_delete], sender=Question)
def sync_question_achievements(sender, instance, **kwargs):
    update_user_achievements(instance.user_id)


@receiver([post_save, post_delete], sender=Answer)
def sync_answer_achievements(sender, instance, **kwargs):
    update_question_answer_count(instance.question_id)
    update_user_achievements(instance.user_id)


@receiver([post_save, post_delete], sender=Vote)
def sync_vote_achievements(sender, instance, **kwargs):
    update_vote_target(instance.voteable_type, instance.voteable_id)
