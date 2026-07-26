#include "core/Trie.h"
#include "logging.h"

#include <cctype> // for std::tolower()

Trie::Trie() : m_root{std::make_unique<TrieNode>()} {}

bool Trie::insert(std::string_view word, dct::WordId word_id, dct::Frequency frequency)
{
  if (word.empty())
  {
    return false;
  }

  TrieNode *node{m_root.get()};

  for (char c : word)
  {
    int index = indexForChar(c);
    if (index < 0)
    {
      return false;
    }

    if (!node->m_children[index])
    {
      node->m_children[index] = std::make_unique<TrieNode>();
    }
    node = node->m_children[index].get();
  }

  if (node->m_isEndOfWord)
  {
    return false;
  }

  node->m_isEndOfWord = true;
  node->m_wordID = word_id;
  node->m_frequency = frequency;
  return true;
}

bool Trie::remove(const std::string &word)
{
  bool removed = removeWord(m_root.get(), word);
  return removed;
}

bool Trie::contains(std::string_view word) const
{
  if (word.empty())
  {
    return false;
  }

  TrieNode *node{m_root.get()};

  for (char c : word)
  {
    int index = indexForChar(c);
    if (index < 0 || !node->m_children[index])
    {
      return false;
    }
    node = node->m_children[index].get();
  }

  return node->m_isEndOfWord;
}

void Trie::dump() const
{
  CROW_LOG_DEBUG << "(root)";
  dumpNode(m_root.get(), ""); // call recursive dump node function
}

void Trie::dumpWord(std::string_view word) const
{
  if (!contains(word))
  {
    return;
  }
  const TrieNode *node{m_root.get()};
  if (!node)
  {
    return;
  }

  CROW_LOG_DEBUG << "(root)";
  size_t depth{0}; // depth to left of screen

  for (char c : word)
  {
    int index = indexForChar(c);

    if (index < 0 || !node->m_children[index])
    {
      CROW_LOG_DEBUG << std::string(depth * 4, ' ') << "└── " << c << "(missing)";
      return;
    }

    node = node->m_children[index].get();

    std::stringstream ss;
    ss << std::string(depth * 4, ' ') << "└── " << c;
    if (node->m_isEndOfWord)
    {
      ss << " *";
    }
    CROW_LOG_DEBUG << ss.str();
    ++depth;
  }
}

void Trie::clear()
{
  m_root = std::make_unique<TrieNode>(); // reset root
}

bool Trie::isEmpty() const
{
  if (!m_root)
  {
    return true;
  }
  if (m_root->m_isEndOfWord)
  {
    return false;
  }

  for (int i{0}; i < dct::g_alpha; ++i)
  {
    if (m_root->m_children[i])
    {
      return false;
    }
  }

  return true;
}
dct::WordId Trie::getWordId(std::string_view word) const
{
  if (word.empty())
  {
    return dct::WordId{dct::g_defaultId};
  }

  TrieNode *node{m_root.get()};

  for (char c : word)
  {
    int index = indexForChar(c);
    if (index < 0 || !node->m_children[index])
    {
      return dct::WordId{dct::g_defaultId};
    }
    node = node->m_children[index].get();
  }

  if (node->m_isEndOfWord)
  {
    return node->m_wordID;
  }
  return dct::WordId{dct::g_defaultId};
}

std::string Trie::getPrefix(std::string_view word) const
{
  const TrieNode *node{m_root.get()};
  std::string prefix;

  for (char c : word)
  {
    int index = indexForChar(c);
    if (index < 0 || !node || !node->m_children[index])
    {
      break;
    }

    prefix.push_back(charForIndex(index));
    node = node->m_children[index].get();
  }

  return prefix;
}

/**
 * Collect a specified number of words using the prefix
 */
void Trie::collectWithPrefix(
    std::string_view prefix,
    std::vector<std::pair<std::string, dct::Frequency>> &out,
    std::size_t limit) const
{
  if (prefix.empty() || limit == 0)
  {
    return; // collect nothing
  }
  const TrieNode *node{m_root.get()};
  std::string currentWord;

  // DFS
  for (char c : prefix)
  {
    int index = indexForChar(c);
    if (index < 0 || !node || !node->m_children[index])
    {
      return; // prefix not found
    }

    currentWord.push_back(c);
    node = node->m_children[index].get();
  }

  // build words
  wordsFromNode(node, currentWord, out, limit);
}

int Trie::indexForChar(char c)
{
  auto lowercase = static_cast<unsigned char>(std::tolower(static_cast<unsigned char>(c)));
  if (lowercase >= 'a' && lowercase <= 'z')
  {
    return lowercase - 'a';
  }
  if (lowercase >= '0' && lowercase <= '9')
  {
    return 26 + (lowercase - '0');
  }
  return -1;
}

char Trie::charForIndex(int index)
{
  if (index >= 0 && index < 26)
  {
    return static_cast<char>('a' + index);
  }
  return static_cast<char>('0' + (index - 26));
}

void Trie::dumpNode(const TrieNode *node, const std::string &prefix) const
{
  if (!node)
  {
    return;
  }

  // DFS
  for (int i{0}; i < dct::g_alpha; ++i)
  {
    char letter{charForIndex(i)};
    const TrieNode *child = node->m_children[i].get();
    if (!child)
    {
      continue;
    }
    bool isLast = true;

    // check for another sibling
    for (int j{i + 1}; j < dct::g_alpha; ++j)
    {
      // check for later children
      if (node->m_children[j])
      {
        // current child is not the last sibling
        isLast = false;
        break;
      }
    }

    // print graphics
    std::stringstream ss;
    ss << prefix << (isLast ? "└── " : "├── ") << letter;
    if (child->m_isEndOfWord)
    {
      ss << " *";
    }
    CROW_LOG_DEBUG << ss.str();

    dumpNode(child, prefix + (isLast ? "    " : "│   "));
  }
}

bool Trie::removeWord(TrieNode *node, std::string_view word)
{
  if (!node)
  {
    return false;
  }

  if (word.empty())
  {
    if (!node->m_isEndOfWord)
    {
      return false;
    }
    node->m_isEndOfWord = false;
    node->m_wordID = dct::WordId{};
    return true;
  }

  int index = indexForChar(word.front());
  if (index < 0 || !node->m_children[index])
  {
    return false;
  }

  bool removed = removeWord(node->m_children[index].get(), word.substr(1));
  if (!removed)
  {
    return false;
  }

  // if the child is now empty (no children and not end-of-word), prune it.
  TrieNode *child = node->m_children[index].get();
  if (child && !child->m_isEndOfWord)
  {
    bool hasAnyChild = false;
    for (int i{0}; i < dct::g_alpha; ++i)
    {
      if (child->m_children[i])
      {
        hasAnyChild = true;
        break;
      }
    }
    if (!hasAnyChild)
    {
      node->m_children[index].reset();
    }
  }

  return true;
}

void Trie::wordsFromNode(
    const TrieNode *node,
    std::string &currentWord,
    std::vector<std::pair<std::string, dct::Frequency>> &out,
    std::size_t limit) const
{
  if (!node || out.size() >= limit)
  {
    return;
  }

  if (node->m_isEndOfWord)
  {
    out.push_back({currentWord, node->m_frequency});
    if (out.size() >= limit)
    {
      return;
    }
  }

  for (int i{0}; i < dct::g_alpha && out.size() < limit; ++i)
  {
    if (node->m_children[i])
    {
      char letter{charForIndex(i)};
      currentWord.push_back(letter);
      wordsFromNode(node->m_children[i].get(), currentWord, out, limit);
      currentWord.pop_back();
    }
  }
}
