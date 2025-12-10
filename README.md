# Dictionary-Spell-Checker
The Spell Checker is a C++ application that uses a Trie (prefix) tree to identify and search a large collection of English words i.e. 20,000 words. The program loads a dictionary file that is identified by a Trie tree, allowing the user to quickly check whether a given word is spelled correctly. If a word is not found, the program can suggest corrections based on similar words stored within the tree.

This project will demonstrate efficient text lookup using Trie search time, O(L). Making it a practical data-structure-driven tool.

The goal of this project is to apply a Trie trees to a real-world context word lookup and spell checking
This includes experience with:
  * Trie implementation
  * Recursion and node manipulation
  * File reading and dictionary parsing
  * Designing search and suggestion algorithms
  * Organizing a dictionary efficiently in memory


Features:
  * Load Dictionary for Trie
  * Word lookup (Spell Check)
  * Suggested Word Corrections
  * Display Dictionary (Alphabetical Order)

# Trie Data Structure: GeeksForGeeks
The trie data structure, also known as a prefix tree, is a tree-like data structure used for efficient retrieval of key-value pairs. It is commonly used for implementing dictionaries and autocomplete features, making it a fundamental component in many search algorithms.

What are the Properties of a Trie Data Structure?
  * Each Trie has an empty root node, with links (or references) to other nodes
  * Each node of a Trie represents a string and each edge represents a character.
  * Every node consists of a hashmap or an array of pointers, with each index representing a character and a flag to indicate if any string ends at the current node.
  * Each path from the root to any node represents a word or string.

Compare Trie and Hash Table
A Trie data structure is used for storing and retrieval of data and the same operations could be done using another data structure which is Hash Table but Trie data structure can perform these operations more efficiently. Moreover, a Trie data structure can be used for prefix-based searching and a sorted traversal of all words. So a Trie has advantages of both hash table and self balancing binary search trees.

  * We can efficiently do prefix search (or auto-complete) with Trie.
  * We can easily print all words in alphabetical order which is not easily possible with hashing.
  * There is no overhead of Hash functions in a Trie data structure.
  * Searching for a String even in the large collection of strings in a Trie data structure can be done in O(L) where L is input key length. Time complexity,
  * The main issue with Trie is extra memory space required to store words and the space may become huge for long list of words and/or for long words.
  * How does Trie Data Structure work?
  * Trie data structure can contain any number of characters including alphabets, numbers, and special characters. But for this article, we will discuss strings with characters a-z. Therefore, only 26 pointers       need for every node, where the 0th index represents 'a' and the 25th index represents 'z' characters.

