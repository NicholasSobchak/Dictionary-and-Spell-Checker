#include <catch2/catch_test_macros.hpp>
#include <nlohmann/json.hpp>

#include "MockDB.h"
#include "core/Dictionary.h"
#include "core/SpellChecker.h"
#include "http/services/WordService.h"

TEST_CASE("WordService::search", "[integration][api]")
{
  static bool seeded = false;
  static std::filesystem::path dbPath;
  if (!seeded)
  {
    dbPath = test_support::tempDbPath("qq_integration.sqlite");
    auto db = test_support::makeFreshDb(dbPath);
    test_support::seedWord(db, "lumen", "unit of luminous flux", {"light"});
    Dictionary::clearGlobalCache();
    seeded = true;
  }

  Dictionary dict;
  SpellChecker checker(dict);
  http::WordService service(dict, checker);

  SECTION("returns 200 with found word")
  {
    auto res = service.search("lumen");

    REQUIRE((res.status == 200));
    auto json = nlohmann::json::parse(res.body);
    CHECK((json["lemma"] == "lumen"));
    CHECK((json["senses"].size() == 1));
    CHECK((json["senses"][0]["definition"] == "unit of luminous flux"));
  }

  SECTION("returns 404 with suggestion when missing")
  {
    auto res = service.search("lumon");

    REQUIRE((res.status == 404));
    auto json = nlohmann::json::parse(res.body);
    CHECK((json["found"] == false));
    CHECK(json["suggestion"].is_string());
  }
}
