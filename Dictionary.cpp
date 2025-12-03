#include "Dictionary.h"
// implement Dicionary.cpp here
Dictionary::Dictionary() : m_root(new TrieNode()) {}

Dictionary::~Dictionary()
{
    delete m_root;
}

void Dictionary::loadFromFile(const string &filename)
{
}

void insert(const string &word)
{
}

bool search(const string &word)
{
}

TrieNode findNode(const char &letter)
{
}

void printDictionary()
{
}
