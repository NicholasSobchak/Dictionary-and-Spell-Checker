#ifndef DICTIONARY_H
#define DICTIONARY_H
#include <iostream>
#include <string>
#include <algorithm>
using namespace std;
class Tester;

class TrieNode
{
public:
    friend class Dictionary;
    friend class SpellChecker;
    TrieNode() : m_isEndOfWord(false), m_word("")
    {
        for (int i = 0; i < 26; ++i)
        {
            m_children[i] = nullptr;
        }
    };

private:
    TrieNode *m_children[26];
    bool m_isEndOfWord;
    string m_word;
};

class Dictionary
{
public:
    friend class Tester;
    // implement Dictionary class here
    Dictionary();
    ~Dictionary();
    void loadFromFile(const string &filename);
    bool insert(const string &word);
    bool search(const string &word);
    TrieNode findNode(const char &letter) const;
    void printDictionary() const;

private:
    TrieNode *m_root;

    /*********************************
    // Helper declarations go here
    **********************************/
    bool openTxt(const string &filename);
};

class SpellChecker
{
public:
    // implement SpellChecker class here

private:
    // private members here

    // helper functions
};

#endif