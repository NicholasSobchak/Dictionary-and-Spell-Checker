#ifndef TRIE_H
#define TRIE_H
#include <array>
#include <memory>
#include <string>
#include <string_view>
#include <vector>

#include "dct/dct.h"

class Trie
{
public:
  Trie();
  ~Trie() = default;

  bool insert(std::string_view word, dct::WordId word_id, dct::Frequency frequency);
  bool remove(const std::string &word);
  bool contains(std::string_view word) const;
  bool isEmpty() const;
  dct::WordId getWordId(std::string_view word) const;
  void collectWithPrefix(
      std::string_view prefix,
      std::vector<std::pair<std::string, dct::Frequency>> &out,
      std::size_t limit) const;

  void clear();

private:
  struct TrieNode
  {
    std::array<std::unique_ptr<TrieNode>, dct::g_alpha> m_children;
    bool m_isEndOfWord{false};
    dct::WordId m_wordID;
    dct::Frequency m_frequency;
  };

  std::unique_ptr<TrieNode> m_root;
  static int indexForChar(char c);
  static char charForIndex(int index);

  bool removeWord(TrieNode *node, std::string_view word);
  void wordsFromNode(
      const TrieNode *node,
      std::string &currentWord,
      std::vector<std::pair<std::string, dct::Frequency>> &out,
      std::size_t limit) const;
};

#endif // TRIE_H
