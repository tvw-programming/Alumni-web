"""RepoUnderstandingV1 accepts LLM quirks for dependency_graph."""

from codegen_core.schemas.spec import RepoUnderstandingV1


def test_empty_list_dependency_graph_coerces_to_dict():
    model = RepoUnderstandingV1.model_validate(
        {
            "modules": ["app"],
            "dependency_graph": [],
        }
    )
    assert model.dependency_graph == {}


def test_missing_dependency_graph_defaults_to_empty_dict():
    model = RepoUnderstandingV1.model_validate({"modules": ["app"]})
    assert model.dependency_graph == {}


def test_list_of_pairs_coerces_to_dict():
    model = RepoUnderstandingV1.model_validate(
        {
            "dependency_graph": [
                ["app.main", ["app.api"]],
                {"module": "app.api", "imports": ["app.deps"]},
            ]
        }
    )
    assert model.dependency_graph == {
        "app.main": ["app.api"],
        "app.api": ["app.deps"],
    }


def test_object_dependency_graph_preserved():
    model = RepoUnderstandingV1.model_validate(
        {"dependency_graph": {"app.main": ["app.api", "app.deps"]}}
    )
    assert model.dependency_graph == {"app.main": ["app.api", "app.deps"]}
