#include <catch2/catch_test_macros.hpp>
#include <chrono>
#include <filesystem>

#include "MockDB.h"
#include "core/SpellChecker.h"

namespace
{

std::filesystem::path makeTempDbPath()
{
  auto dir = std::filesystem::temp_directory_path();
  auto stamp = std::chrono::steady_clock::now().time_since_epoch().count();
  return dir / ("qq-spellcheckertests-" + std::to_string(stamp) + ".db");
}

struct TestSpell
{
  std::filesystem::path path;
  Dictionary dict;

  TestSpell() : path(makeTempDbPath()), dict(buildDict(path)) {}

  static Dictionary buildDict(const std::filesystem::path &p)
  {
    Dictionary::clearGlobalCache();
    auto db = test_support::makeFreshDb(p);
    test_support::seedWord(db, "chamber", "a room", {"quarters"});
    test_support::seedWord(db, "dreary", "gloomy", {"bleak"});
    test_support::seedWord(db, "raven", "a black bird", {"crow"});
    test_support::seedWord(db, "nevermore", "never again", {"never"});
    test_support::seedWord(db, "curtain", "a hanging screen", {"drape"});
    test_support::seedWord(db, "ebony", "dark black wood", {"black"});
    test_support::seedWord(db, "pallid", "pale", {"wan"});
    test_support::seedWord(db, "chained", "bound with chains", {"fettered"});
    return test_support::makeDictionaryOnDb(p);
  }

  SpellChecker makeChecker() { return SpellChecker{dict}; }

  ~TestSpell()
  {
    std::error_code ec;
    std::filesystem::remove(path, ec);
  }
};

} // namespace

TEST_CASE("SpellChecker::suggest", "[spellchecker]")
{
  TestSpell ts;
  auto checker = ts.makeChecker();

  SECTION("SpellChecker::suggest::finds word within 1 edit distance")
  {
    auto results = checker.suggest("dreay");
    REQUIRE_FALSE(results.empty());
    CHECK(results[0] == "dreary");
  }

  SECTION("SpellChecker::suggest::returns multiple matches")
  {
    auto results = checker.suggest("ebon");
    REQUIRE_FALSE(results.empty());
    CHECK(results[0] == "ebony");
  }

  SECTION("SpellChecker::suggest::empty for no match")
  {
    auto results = checker.suggest("zzzzz");
    CHECK(results.empty());
  }

  SECTION("SpellChecker::suggest::empty for empty input")
  {
    auto results = checker.suggest("");
    CHECK(results.empty());
  }
}

TEST_CASE("SpellChecker::correct", "[spellchecker]")
{
  TestSpell ts;
  auto checker = ts.makeChecker();

  SECTION("SpellChecker::correct::empty for correctly spelled word")
  {
    auto result = checker.correct("dreary");
    CHECK(result.empty());
  }

  SECTION("SpellChecker::correct::returns correction for misspelling")
  {
    auto result = checker.correct("dreay");
    CHECK(result == "dreary");
  }

  SECTION("SpellChecker::correct::returns original when no suggestion")
  {
    auto result = checker.correct("zzzzz");
    CHECK(result == "zzzzz");
  }

  SECTION("SpellChecker::correct::empty for empty input")
  {
    auto result = checker.correct("");
    CHECK(result.empty());
  }
}

TEST_CASE("SpellChecker::autofill", "[spellchecker]")
{
  TestSpell ts;
  auto checker = ts.makeChecker();

  SECTION("SpellChecker::autofill::prefix completion")
  {
    auto result = checker.autofill("ne");
    CHECK(result == "nevermore");
  }

  SECTION("SpellChecker::autofill::longer prefix")
  {
    auto result = checker.autofill("ra");
    CHECK(result == "raven");
  }

  SECTION("SpellChecker::autofill::history takes priority")
  {
    auto result = checker.autofill("cu", {"curtain"}, {});
    CHECK(result == "curtain");
  }

  SECTION("SpellChecker::autofill::suggested fallback")
  {
    auto result = checker.autofill("p", {}, {"pallid"});
    CHECK(result == "pallid");
  }

  SECTION("SpellChecker::autofill::empty for no match")
  {
    auto result = checker.autofill("zz");
    CHECK(result.empty());
  }
}
