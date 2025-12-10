#include "Dictionary.h"
#include <fstream>
// implement Dicionary.cpp here
Dictionary::Dictionary() : m_root(new TrieNode()) {}

Dictionary::~Dictionary() { delete m_root; }

void Dictionary::loadFromFile(const string &filename)
{
    /*
    compatible file type:
        .txt
        .csv
        .tsv
        .json
        .xml
    */
    openTxt(filename); // .txt

}

bool Dictionary::insert(const string &word)
{
    TrieNode *current = m_root;
    for (int i = 0; i < int(word.length()); ++i)
    {
        if (!isalpha(word[i]))
            continue;
        char letter = tolower(word[i]);

        int index = letter - 'a'; // general online formula to get the numeric index - (uses ASCII value),(0-based indexing)
        // check if there is an existing child node
        if (!current->m_children[index])
        {
            current->m_children[index] = new TrieNode(); // create new child node

            // check if the current letter is the end of the word
            if (i == int(word.length() - 1))
            {
                current->m_isEndOfWord = true;
                current->m_word = word; // store the word in the dictionary
            }
        }

        current = current->m_children[index];
    }
    return current->m_isEndOfWord;
}

bool Dictionary::search(const string &word)
{
    return false;
}

TrieNode findNode(const char &letter)
{
    return TrieNode();
}

void printDictionary()
{
}
