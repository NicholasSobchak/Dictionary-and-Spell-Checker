#ifndef WORDINFO_H
#define WORDINFO_H
#include <string>
#include <vector>

#include "dct/dct.h"

struct Sense
{
  dct::WordId id;
  std::string pos; // noun, verb, adj, etc.
  std::string definition;
  std::vector<std::string> examples;
  std::vector<std::string> synonyms;
  std::vector<std::string> antonyms;
};

struct Form
{
  std::string form;
  std::string tag;
};

struct WordInfo
{
  dct::WordId id{};
  std::string lemma;
  std::string displayLemma;
  dct::Frequency frequency{};

  std::vector<std::string> etymology;
  std::vector<Form> forms;
  std::vector<Sense> senses;
};

#endif // WORDINFO_H
