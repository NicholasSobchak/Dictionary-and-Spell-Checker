#include "http/dto/WordResponse.h" // dto = Data Transfer Objects

#include "nlohmann/json.hpp"

namespace http
{
// converts WordInfo into JSON response format
std::string toWordJson(
    const WordInfo &info,
    const std::string &query,
    const std::vector<std::string> &alternativeSearches)
{
  nlohmann::json j;
  j["id"] = info.id;
  j["lemma"] = info.lemma;
  if (!info.displayLemma.empty())
  {
    j["display_lemma"] = info.displayLemma;
  }
  if (!query.empty())
  {
    j["query"] = query;
  }

  j["forms"] = nlohmann::json::array();
  for (const auto &f : info.forms)
  {
    j["forms"].push_back({{"form", f.form}, {"tag", f.tag}});
  }

  j["senses"] = nlohmann::json::array();
  for (const auto &s : info.senses)
  {
    j["senses"].push_back(
        {{"pos", s.pos},
         {"definition", s.definition},
         {"examples", s.examples},
         {"synonyms", s.synonyms},
         {"antonyms", s.antonyms}});
  }

  j["etymology"] = info.etymology;
  j["alternative_searches"] = alternativeSearches;

  return j.dump();
}
} // end namespace http
