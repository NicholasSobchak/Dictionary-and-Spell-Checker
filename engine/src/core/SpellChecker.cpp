#include "core/SpellChecker.h"
#include "logging.h"

#include <algorithm>
#include <unordered_set>

#include "dct/dct.h"

SpellChecker::SpellChecker(const Dictionary &dict) : m_dict{dict} {}

std::vector<std::string> SpellChecker::suggest(std::string_view prefix) const
{
  std::string clean = dct::sanitizeWord(prefix);
  if (clean.empty())
  {
    return {};
  }

  std::vector<std::string> suggestions = m_dict.suggestFromPrefix(clean);

  std::vector<std::string> results;
  int count{};
  for (const auto &word : suggestions)
  {
    if (count == dct::g_max_suggestions)
    {
      break;
    }
    results.push_back(word);
    count++;
  }

  return results;
}

std::string SpellChecker::correct(std::string_view word) const
{
  std::string clean{dct::sanitizeWord(word)};
  if (clean.empty())
  {
    return {};
  }

  if (m_dict.contains(clean))
  {
    return {};
  }

  std::vector<std::string> suggestions = m_dict.suggestSpelling(clean);

  if (!suggestions.empty())
  {
    return suggestions[0]; // return the first suggestion
  }

  return clean; // return the original word if no suggestions are found
}

// NOLINTNEXTLINE(bugprone-easily-swappable-parameters)
std::string SpellChecker::autofill(
    std::string_view word,
    const std::vector<std::string> &history,
    const std::vector<std::string> &suggested) const
{
  if (word.empty())
  {
    return {};
  }

  return m_dict.autofillFromTrie(word, history, suggested);
}

void SpellChecker::dumpList(const std::vector<std::string> &out) const
{
  if (out.empty())
  {
    return;
  }
  else
  {
    for (const auto &word : out)
    {
      CROW_LOG_DEBUG << "  → " << word;
    }
  }
}
