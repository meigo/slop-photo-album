from pathlib import Path

from server.tags import score_tags


FIX = Path(__file__).parent.parent / "fixtures"


def test_score_tags_returns_top_k() -> None:
    result = score_tags(str(FIX / "sharp.jpg"), top_k=5)
    assert isinstance(result, list)
    assert len(result) == 5
    for entry in result:
        assert set(entry.keys()) == {"tag", "score"}
        assert isinstance(entry["score"], float)
        assert 0.0 <= entry["score"] <= 1.0
    # Top-K should be sorted descending by score
    scores = [e["score"] for e in result]
    assert scores == sorted(scores, reverse=True)


def test_score_tags_total_below_one() -> None:
    # Top-5 of a softmax-distributed set should sum to < 1.0
    result = score_tags(str(FIX / "sharp.jpg"), top_k=5)
    total = sum(e["score"] for e in result)
    assert total <= 1.0001
