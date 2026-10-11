import pytest
from app.core.config import Settings


def test_settings_debug_tolerant_of_non_boolean_values():
    # Non-boolean strings such as "release", "prod", "production" should not crash and should parse to False
    s_release = Settings(DEBUG="release")
    assert s_release.DEBUG is False

    s_prod = Settings(DEBUG="prod")
    assert s_prod.DEBUG is False

    s_unknown = Settings(DEBUG="something_random")
    assert s_unknown.DEBUG is False

    # Boolean and recognized truthy strings should parse to True
    s_true = Settings(DEBUG="true")
    assert s_true.DEBUG is True

    s_one = Settings(DEBUG="1")
    assert s_one.DEBUG is True

    s_dev = Settings(DEBUG="dev")
    assert s_dev.DEBUG is True

    # Falsy values
    s_false = Settings(DEBUG="false")
    assert s_false.DEBUG is False

    s_zero = Settings(DEBUG="0")
    assert s_zero.DEBUG is False
