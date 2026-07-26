#include <catch2/catch_test_macros.hpp>
#include <nlohmann/json.hpp>

#include "MockDB.h"
#include "core/Dictionary.h"
#include "http/services/WordService.h"

TEST_CASE("WordService::search", "[integration][api]")
{
  static bool seeded = false;
  if (!seeded)
  {
    auto tmp = test_support::tempDbPath("qq_integration.sqlite");
    auto db = test_support::makeFreshDb(tmp);
    test_support::seedWord(db, "lumen", "unit of luminous flux", {"light"});
    http::wordService().warmupDictionary();
    Dictionary::clearGlobalCache();
    seeded = true;
  }

  SECTION("returns 200 with found word")
  {
    auto res = http::wordService().search("lumen");

    REQUIRE((res.status == 200));
    auto json = nlohmann::json::parse(res.body);
    CHECK((json["lemma"] == "lumen"));
    CHECK((json["senses"].size() == 1));
    CHECK((json["senses"][0]["definition"] == "unit of luminous flux"));
  }

  SECTION("returns 404 with suggestion when missing")
  {
    auto res = http::wordService().search("lumon");

    REQUIRE((res.status == 404));
    auto json = nlohmann::json::parse(res.body);
    CHECK((json["found"] == false));
    CHECK(json["suggestion"].is_string());
  }
}
