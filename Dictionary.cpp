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
    // implement

    return false;
}

TrieNode findNode(const char &letter)
{
    // implement

    return TrieNode();
}

void printDictionary()
{
    // implement
}

/*********************************
// Dictionary Helper Functions
**********************************/
bool Dictionary::openTxt(const string &filename) // open .txt file
{
    // open file
    ifstream file(filename);
    if (!file.is_open())
    {
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
        word.erase(remove_if(word.begin(), word.end(), [](unsigned char c)
                             { return !isalpha(c); }),
                   word.end());

        // make lowercase (uses lambda function) (see C++ documentation for transform())
        transform(word.begin(), word.end(), word.begin(), [](unsigned char c)
                  { return tolower(c); });

        // is word empty after processing?
        if (word.empty())
            continue;

        insert(word); // add word to trie data structure
    }

    file.close();
    return true;
}

bool Dictionary::openCsv(const string &filename)
{
	return true;
}

bool Dictionary::openTsv(const string &filename)                                
{
	return true;
}

bool Dictionary::openJson(const string &filename)
{
	return true;
}

bool Dictionary::openXml(const string &filename)
{
	return true;
}
