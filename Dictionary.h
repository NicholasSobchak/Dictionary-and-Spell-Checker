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

    // helper functions
    bool openTxt(const string& filename) // open .txt file
    {
        // open file 
        ifstream file(filename);
        if (!file.is_open()) {
            throw runtime_error("Error: Cannot open file!");
            return false;
        }
        
        // parse words
        string word;
        while (file >> word)
        {
            /*
            lambda always has the following structure in C++:

                [capture-clause] (parameters) mutable/noexcept -> return-type { function body }

            The first lambda returns a boolean that will determine if the character will be removed from the word using remove_if & erase()
            The second lambda returns the lowercase version of the character c and uses the transform method that assigns the returns lambda value back into the string
            */

            // remove non char (uses lambda function)
            word.erase(remove_if(word.begin(), word.end(), [](unsigned char c){ return !isalpha(c); }), word.end());

            // make lowercase (uses lambda function) (see C++ documentation for transform())
            transform(word.begin(), word.end(), word.begin(), [](unsigned char c){ return tolower(c); });

            // is word empty after processing?
            if (word.empty())
                continue;

            insert(word); // add word to trie data structure
        }

        file.close();
        return true;
    }
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