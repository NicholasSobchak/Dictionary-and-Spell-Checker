#ifndef UTILS_TESTS_MOCKDB_H
#define UTILS_TESTS_MOCKDB_H

#include <cstdlib>
#include <filesystem>
#include <nlohmann/json.hpp>
#include <utility>

#include "core/Dictionary.h"
#include "core/SpellChecker.h"
#include "data/Database.h"

namespace test_support
{

inline std::filesystem::path tempDbPath(const std::string &name = "qq_test.sqlite")
{
  return std::filesystem::temp_directory_path() / name;
}

inline void writeConfigForDb(const std::filesystem::path &dbPath)
{
  // Use env only so tests do not overwrite the developer's local config.json.
  setenv("DATABASE_PATH", dbPath.string().c_str(), 1);
}

inline Database makeFreshDb(const std::filesystem::path &dbPath)
{
  std::filesystem::remove(dbPath);
  writeConfigForDb(dbPath);
  Database db(dbPath.string());
  db.createTables();
  return std::move(db);
}

inline void seedWord(
    Database &db,
    const std::string &lemma,
    const std::string &definition,
    const std::vector<std::string> &synonyms = {},
    int freq = 1)
{
  auto id = db.insertWord(lemma, lemma, dct::Frequency{freq});
  auto sense = db.insertSense(id, "", definition);
  for (const auto &s : synonyms)
  {
    db.insertSynonym(sense, s);
  }
}

inline Dictionary makeDictionaryOnDb(const std::filesystem::path &dbPath)
{
  // Ensures Config reads the right path when Dictionary constructs
  setenv("DATABASE_PATH", dbPath.string().c_str(), 1);
  return Dictionary{};
}

inline SpellChecker makeSpellCheckerOnDb(const std::filesystem::path &dbPath)
{
  auto dict = makeDictionaryOnDb(dbPath);
  return SpellChecker{dict};
}

} // end namespace test_support

#endif // UTILS_TESTS_MOCKDB_H
