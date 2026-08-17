#ifndef UTILS_DCT_H
#define UTILS_DCT_H
#include <nlohmann/json.hpp>
#include <ostream>
#include <string>
#include <string_view>
#include <vector>

namespace dct
{

inline constexpr int g_alpha{36}; // 26 letters + 10 digits
inline constexpr int g_defaultId{-1};
inline constexpr int g_max_suggestions{30};

/*
 * Strongly type WordId with explicit construction and comparison operator
 */
struct WordId
{
  int value;

  explicit WordId(int val = g_defaultId) : value{val} {}
  bool operator==(const WordId &other) const { return value == other.value; }
};

inline void to_json(nlohmann::json &j, const WordId &id) { j = id.value; }

inline std::ostream &operator<<(std::ostream &os, const WordId &id)
{
  os << id.value;
  return os;
}

/*
 * Strongly type Frequency with explicit consturciton and comparison operator
 */
struct Frequency
{
  int value;

  explicit Frequency(int val = 0) : value{val} {}
  bool operator==(const Frequency &other) const { return value == other.value; }
};

inline void to_json(nlohmann::json &j, const Frequency &freq) { j = freq.value; }

inline std::ostream &operator<<(std::ostream &os, const Frequency &freq)
{
  os << freq.value;
  return os;
}

/*
 * The trie and database are stored with sanatized words
 */
inline std::string sanitizeWord(std::string_view word)
{
  std::string clean;
  clean.reserve(word.size());

  for (unsigned char c : word)
  {
    if (!std::isalnum(c))
    {
      continue;
    }
    clean.push_back(static_cast<char>(std::tolower(c)));
  }

  return clean;
}

/*
 * Vladimir Levenshtein's algorithm for edit distance
 * s1 and s2 are represented as rows in a matrix
 * Iterate through s1 and s2 and calculate the minimum cost to transform the
 * s1 current char to s2 current char
 *
 * Important note: After each row is calculated col and prev_col are swapped
 * this helps avoid allocating a full 2D matrix which would be costly to memory
 */
inline size_t calculateLevenshteinDistance(std::string_view s1, std::string_view s2)
{
  if (s1.length() == 0)
  {
    return s2.length();
  }
  if (s2.length() == 0)
  {
    return s1.length();
  }
  const auto s1Length{s1.length()};
  const auto s2Length{s2.length()};

  // represent a cell in matrix rows
  std::vector<size_t> col(s2Length + 1);
  std::vector<size_t> prev_col(s2Length + 1);

  // set each element to itself
  for (size_t i{0}; i < prev_col.size(); ++i)
  {
    prev_col[i] = i;
  }

  for (size_t i{0}; i < s1Length; ++i)
  {
    col[0] = i + 1;
    for (unsigned int j{0}; j < s2Length; j++)
    {
      col[j + 1] = std::min(
          prev_col[j + 1] + 1, std::min(col[j] + 1, prev_col[j] + (s1[i] == s2[j] ? 0 : 1)));
    }
    col.swap(prev_col);
  }
  return prev_col[s2Length];
}
} // end namespace dct

#endif // UTILS_DCT_H
