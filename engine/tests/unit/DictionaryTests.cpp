#include <catch2/catch_test_macros.hpp>
#include <chrono>
#include <filesystem>

#include "MockDB.h"
#include "core/Dictionary.h"

namespace
{

std::filesystem::path makeTempDbPath()
{
  auto dir = std::filesystem::temp_directory_path();
  auto stamp = std::chrono::steady_clock::now().time_since_epoch().count();
  return dir / ("qq-dictionarytests-" + std::to_string(stamp) + ".db");
}

struct TestDict
{
  std::filesystem::path path;

  TestDict()
  {
    Dictionary::clearGlobalCache();
    path = makeTempDbPath();
    auto db = test_support::makeFreshDb(path);
    test_support::seedWord(db, "diamond", "a precious stone", {"gem"});
    test_support::seedWord(db, "glints", "brief flashes of light", {"sparkles"});
    test_support::seedWord(db, "snow", "frozen precipitation", {"sleet"});
    test_support::seedWord(db, "birds", "feathered animals", {"fowl"});
    test_support::seedWord(db, "circle", "a round shape", {"ring"});
    test_support::seedWord(db, "flight", "the act of flying", {"aviation"});
  }

  Dictionary makeDict() { return test_support::makeDictionaryOnDb(path); }

  ~TestDict()
  {
    std::error_code ec;
    std::filesystem::remove(path, ec);
  }
};

} // namespace

TEST_CASE("Dictionary::contains", "[dictionary]")
{
  TestDict td;
  auto dict = td.makeDict();

  SECTION("Dictionary::contains::existing word returns true")
  {
    CHECK(dict.contains("diamond"));
    CHECK(dict.contains("glints"));
  }

  SECTION("Dictionary::contains::non-existing word returns false")
  {
    CHECK_FALSE(dict.contains("nonexistent"));
    CHECK_FALSE(dict.contains(""));
  }

  SECTION("Dictionary::contains::case insensitive")
  {
    CHECK(dict.contains("DIAMOND"));
    CHECK(dict.contains("Glints"));
  }
}

TEST_CASE("Dictionary::getWordInfo", "[dictionary]")
{
  TestDict td;
  auto dict = td.makeDict();

  SECTION("Dictionary::getWordInfo::correct lemma and definition")
  {
    auto info = dict.getWordInfo("diamond");
    REQUIRE_FALSE(info.lemma.empty());
    CHECK(info.lemma == "diamond");
    REQUIRE(info.senses.size() >= 1);
    CHECK(info.senses[0].definition == "a precious stone");
  }

  SECTION("Dictionary::getWordInfo::returns empty for non-existing word")
  {
    auto info = dict.getWordInfo("nonexistent");
    CHECK(info.lemma.empty());
    CHECK(info.senses.empty());
  }

  SECTION("Dictionary::getWordInfo::includes synonyms")
  {
    auto info = dict.getWordInfo("glints");
    REQUIRE_FALSE(info.senses.empty());
    REQUIRE_FALSE(info.senses[0].synonyms.empty());
    CHECK(info.senses[0].synonyms[0] == "sparkles");
  }
}

TEST_CASE("Dictionary::suggestFromPrefix", "[dictionary]")
{
  TestDict td;
  auto dict = td.makeDict();

  SECTION("Dictionary::suggestFromPrefix::words within 1 edit distance")
  {
    auto results = dict.suggestFromPrefix("sno");
    REQUIRE_FALSE(results.empty());
    CHECK(results[0] == "snow");
  }

  SECTION("Dictionary::suggestFromPrefix::empty for non-matching")
  {
    auto results = dict.suggestFromPrefix("zzzz");
    CHECK(results.empty());
  }

  SECTION("Dictionary::suggestFromPrefix::empty for empty input")
  {
    auto results = dict.suggestFromPrefix("");
    CHECK(results.empty());
  }
}

TEST_CASE("Dictionary::suggestSpelling", "[dictionary]")
{
  TestDict td;
  auto dict = td.makeDict();

  SECTION("Dictionary::suggestSpelling::suggestions for misspelled word")
  {
    auto results = dict.suggestSpelling("diamnd");
    REQUIRE_FALSE(results.empty());
    CHECK(results[0] == "diamond");
  }

  SECTION("Dictionary::suggestSpelling::empty for correctly spelled word")
  {
    auto results = dict.suggestSpelling("diamond");
    CHECK(results.empty());
  }

  SECTION("Dictionary::suggestSpelling::suggestions for close misspelling")
  {
    auto results = dict.suggestSpelling("bird");
    REQUIRE_FALSE(results.empty());
    CHECK(results[0] == "birds");
  }
}

TEST_CASE("Dictionary::getAlternativeSearches", "[dictionary]")
{
  TestDict td;
  auto dict = td.makeDict();

  SECTION("Dictionary::getAlternativeSearches::empty when no alternatives")
  {
    auto alts = dict.getAlternativeSearches("diamond");
    CHECK(alts.empty());
  }
}

TEST_CASE("Dictionary::suggestSynonyms", "[dictionary]")
{
  TestDict td;
  auto dict = td.makeDict();

  SECTION("Dictionary::suggestSynonyms::returns synonyms for existing word")
  {
    auto syns = dict.suggestSynonyms("glints");
    REQUIRE_FALSE(syns.empty());
    CHECK(syns.size() <= 1);
  }

  SECTION("Dictionary::suggestSynonyms::empty for word without synonyms")
  {
    auto syns = dict.suggestSynonyms("nonexistent");
    CHECK(syns.empty());
  }
}

TEST_CASE("Dictionary::autofillFromTrie", "[dictionary]")
{
  TestDict td;
  auto dict = td.makeDict();

  SECTION("Dictionary::autofillFromTrie::completion from history first")
  {
    auto result = dict.autofillFromTrie("c", {"circle"}, {"flight"});
    CHECK(result == "circle");
  }

  SECTION("Dictionary::autofillFromTrie::completion from suggested")
  {
    auto result = dict.autofillFromTrie("f", {}, {"flight"});
    CHECK(result == "flight");
  }

  SECTION("Dictionary::autofillFromTrie::best match for prefix")
  {
    auto result = dict.autofillFromTrie("dia", {}, {});
    CHECK(result == "diamond");
  }

  SECTION("Dictionary::autofillFromTrie::empty for non-matching prefix")
  {
    auto result = dict.autofillFromTrie("zz", {}, {});
    CHECK(result.empty());
  }
}
