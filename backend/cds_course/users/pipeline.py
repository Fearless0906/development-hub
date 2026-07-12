def update_oauth_profile(backend, user, response, *args, **kwargs):
    """Persist provider profile fields on the local Django user."""
    if user is None:
        return

    provider = backend.name
    changed_fields = []

    if provider == "google-oauth2":
        avatar_url = response.get("picture")
    elif provider == "github":
        avatar_url = response.get("avatar_url")
        github_username = response.get("login")
        if github_username and user.github_username != github_username:
            user.github_username = github_username
            changed_fields.append("github_username")
    else:
        avatar_url = None

    if avatar_url and user.avatar_url != avatar_url:
        user.avatar_url = avatar_url
        changed_fields.append("avatar_url")

    if changed_fields:
        user.save(update_fields=[*changed_fields, "updated_at"])
