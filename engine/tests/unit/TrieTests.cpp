#include <catch2/catch_test_macros.hpp>

#include "core/Trie.h"

TEST_CASE("Trie::insert", "[trie]")
{
  Trie trie;
  REQUIRE(trie.isEmpty());

  SECTION("Trie::insert::reject duplicate")
  {
    REQUIRE(trie.insert("had", dct::WordId{1}, dct::Frequency{1}));
    REQUIRE(trie.insert("hath", dct::WordId{2}, dct::Frequency{1}));
    REQUIRE_FALSE(trie.insert("hath", dct::WordId{3}, dct::Frequency{1}));
    REQUIRE(trie.contains("had"));
    REQUIRE(trie.contains("hath"));
    REQUIRE_FALSE(trie.contains("impaired"));
  }

  SECTION("Trie::insert::reject non-alphanumeric")
  {
    REQUIRE_FALSE(trie.insert("raven!", dct::WordId{1}, dct::Frequency{1}));
    REQUIRE(trie.insert("tress01", dct::WordId{2}, dct::Frequency{1}));
    REQUIRE(trie.contains("tress01"));
    REQUIRE(trie.insert("1she1", dct::WordId{3}, dct::Frequency{1}));
    REQUIRE(trie.contains("1she1"));
    REQUIRE_FALSE(trie.contains("%walks^!"));
  }

  SECTION("Trie::insert::case handling")
  {
    trie.insert("beauty", dct::WordId{1}, dct::Frequency{1});
    trie.insert("LIKE", dct::WordId{2}, dct::Frequency{1});
    REQUIRE(trie.contains("BEAUTY"));
    REQUIRE(trie.contains("like"));
  }

  SECTION("Trie::insert::long word")
  {
    CHECK(trie.insert("hippopotomonstrosesquipedaliophobia", dct::WordId{1}, dct::Frequency{1}));
    REQUIRE(trie.contains("hippopotomonstrosesquipedaliophobia"));
    std::vector<std::pair<std::string, dct::Frequency>> out;
    trie.collectWithPrefix("hippo", out, 1);
    REQUIRE(out.size() == 1);
    CHECK(out[0].first == "hippopotomonstrosesquipedaliophobia");
  }

  SECTION("Trie::insert::empty input")
  {
    REQUIRE_FALSE(trie.insert("", dct::WordId{1}, dct::Frequency{1}));
    REQUIRE_FALSE(trie.contains(""));
    REQUIRE(trie.getWordId("").value == -1);

    std::vector<std::pair<std::string, dct::Frequency>> out;
    trie.insert("ever", dct::WordId{1}, dct::Frequency{1});
    trie.insert("every", dct::WordId{2}, dct::Frequency{1});
    trie.collectWithPrefix("", out, 2);
    REQUIRE(out.size() == 0);
    trie.collectWithPrefix("eve", out, 0);
    REQUIRE(out.size() == 0);
  }
}

TEST_CASE("Trie::getWordId", "[trie]")
{
  SECTION("Trie::getWordId::returns correct id")
  {
    Trie trie;
    trie.insert("this", dct::WordId{42}, dct::Frequency{1});
    trie.insert("nameless", dct::WordId{7}, dct::Frequency{1});
    REQUIRE(trie.getWordId("this").value == 42);
    REQUIRE(trie.getWordId("nameless").value == 7);
    REQUIRE(trie.getWordId("name").value == -1);
  }

  SECTION("Trie::getWordId::correct id after removal")
  {
    Trie trie;
    trie.insert("thats", dct::WordId{1}, dct::Frequency{1});
    trie.insert("best", dct::WordId{2}, dct::Frequency{1});
    REQUIRE(trie.remove("thats"));
    REQUIRE(trie.getWordId("thats").value == -1);
    REQUIRE(trie.getWordId("best").value == 2);
  }
}

TEST_CASE("Trie::collectWithPrefix", "[trie]")
{
  SECTION("Trie::collectWithPrefix::respects limit order")
  {
    Trie trie;
    trie.insert("grace", dct::WordId{1}, dct::Frequency{1});
    trie.insert("grandeur", dct::WordId{2}, dct::Frequency{1});
    trie.insert("gratitude", dct::WordId{3}, dct::Frequency{1});
    trie.insert("that", dct::WordId{4}, dct::Frequency{1});

    std::vector<std::pair<std::string, dct::Frequency>> out;
    trie.collectWithPrefix("gra", out, 2);
    REQUIRE(out.size() == 2);
    REQUIRE(out[0].first == "grace");
    REQUIRE(out[1].first == "grandeur");
  }

  SECTION("Trie::collectWithPrefix::prefix not present")
  {
    Trie trie;
    trie.insert("and", dct::WordId{1}, dct::Frequency{1});
    trie.insert("starry", dct::WordId{2}, dct::Frequency{1});
    trie.insert("skies", dct::WordId{3}, dct::Frequency{1});

    std::vector<std::pair<std::string, dct::Frequency>> out;
    trie.collectWithPrefix("all", out, 3);
    REQUIRE(out.size() == 0);
  }
}

TEST_CASE("Trie::remove", "[trie]")
{
  SECTION("Trie::remove::deletes only targeted word")
  {
    Trie trie;
    trie.insert("wave", dct::WordId{1}, dct::Frequency{1});
    trie.insert("waves", dct::WordId{2}, dct::Frequency{1});
    REQUIRE(trie.remove("wave"));
    REQUIRE_FALSE(trie.contains("wave"));
    REQUIRE(trie.contains("waves"));
  }

  SECTION("Trie::remove::single letter word")
  {
    Trie trie;
    trie.insert("o", dct::WordId{1}, dct::Frequency{1});
    trie.insert("or", dct::WordId{2}, dct::Frequency{1});
    REQUIRE(trie.remove("o"));
    REQUIRE_FALSE(trie.contains("o"));
    REQUIRE(trie.contains("or"));
  }

  SECTION("Trie::remove::non-existent word")
  {
    Trie trie;
    trie.insert("the", dct::WordId{1}, dct::Frequency{1});
    trie.insert("night", dct::WordId{2}, dct::Frequency{1});
    REQUIRE_FALSE(trie.remove("of"));
    REQUIRE(trie.contains("the"));
    REQUIRE(trie.contains("night"));
  }

  SECTION("Trie::remove::only word leaves trie empty")
  {
    Trie trie;
    trie.insert("cloudless", dct::WordId{1}, dct::Frequency{1});
    REQUIRE(trie.remove("cloudless"));
    REQUIRE(trie.isEmpty());
    REQUIRE(trie.insert("climes", dct::WordId{2}, dct::Frequency{1}));
    REQUIRE(trie.contains("climes"));
  }
}

TEST_CASE("Trie::clear", "[trie]")
{
  Trie trie;
  trie.insert("in", dct::WordId{1}, dct::Frequency{1});
  trie.clear();
  REQUIRE(trie.isEmpty());
  REQUIRE_FALSE(trie.contains("in"));
  REQUIRE(trie.getWordId("in").value == -1);
}
