// Fall 2025 - Dictionary/Spell Checker - Collaborative Project
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <chrono>
#include <iostream>
#include <sstream>
#include <string>

#include "core/Dictionary.h"
#include "core/SpellChecker.h"
#include "dct/dct.h"

using json = nlohmann::json;

namespace
{
void printLine()
{
  for (int i = 0; i < 50; ++i)
  {
    std::cout << "\u2500";
  }
  std::cout << '\n';
}

void printHeader(const std::string &title)
{
  std::cout << '\n' << "\u2500\u2500 " << title << ' ';
  printLine();
}

void printWordInfo(const WordInfo &info)
{
  printHeader("WORDS");
  std::cout << "id=" << info.id << "  lemma=" << (info.lemma.empty() ? "UNKNOWN" : info.lemma)
            << "  display_lemma=" << (info.displayLemma.empty() ? "UNKNOWN" : info.displayLemma)
            << "  frequency=" << info.frequency << '\n';

  if (!info.etymology.empty())
  {
    printHeader("ETYMOLOGY");
    for (std::size_t i = 0; i < info.etymology.size(); ++i)
    {
      if (info.etymology.size() > 1)
      {
        std::cout << "[" << i + 1 << "] ";
      }
      std::cout << info.etymology[i] << '\n';
    }
  }

  if (!info.senses.empty())
  {
    printHeader("SENSES");
    for (const auto &s : info.senses)
    {
      std::cout << "id=" << s.id << "  pos=" << (s.pos.empty() ? "-" : s.pos) << "  "
                << s.definition << '\n';
    }

    bool hasExamples = false;
    for (const auto &s : info.senses)
    {
      if (!s.examples.empty())
      {
        hasExamples = true;
        break;
      }
    }
    if (hasExamples)
    {
      printHeader("EXAMPLES");
      for (const auto &s : info.senses)
      {
        for (const auto &ex : s.examples)
        {
          std::cout << "sense_id=" << s.id << "  " << ex << '\n';
        }
      }
    }

    bool hasSynonyms = false;
    for (const auto &s : info.senses)
    {
      if (!s.synonyms.empty())
      {
        hasSynonyms = true;
        break;
      }
    }
    if (hasSynonyms)
    {
      printHeader("SYNONYMS");
      for (const auto &s : info.senses)
      {
        for (const auto &syn : s.synonyms)
        {
          std::cout << "sense_id=" << s.id << "  " << syn << '\n';
        }
      }
    }

    bool hasAntonyms = false;
    for (const auto &s : info.senses)
    {
      if (!s.antonyms.empty())
      {
        hasAntonyms = true;
        break;
      }
    }
    if (hasAntonyms)
    {
      printHeader("ANTONYMS");
      for (const auto &s : info.senses)
      {
        for (const auto &ant : s.antonyms)
        {
          std::cout << "sense_id=" << s.id << "  " << ant << '\n';
        }
      }
    }
  }
  else
  {
    std::cout << "\nNo senses available.\n";
  }

  if (!info.forms.empty())
  {
    printHeader("FORMS");
    for (const auto &f : info.forms)
    {
      std::cout << "  " << f.form;
      if (!f.tag.empty())
      {
        std::cout << " (" << f.tag << ")";
      }
      std::cout << '\n';
    }
  }

  if (info.etymology.empty() && info.senses.empty() && info.forms.empty())
  {
    std::cout << "\nWord not found.\n";
  }
}
} // end namespace

int main()
{
  Dictionary dict;
  SpellChecker checker(dict);
#if 1
  std::cout << "TEST BUILD: lookup <word>, correct <word>, suggest "
               "<word>, exit\n";

  // currently testing funcitons needed to be implemented (printWordInfo,
  // checker.correct, checker.suggest
  std::string line;
  while (std::cout << "> " && std::getline(std::cin, line))
  {
    if (line.empty())
    {
      continue;
    }
    std::istringstream iss(line);
    std::string command;
    std::string arg;
    iss >> command >> arg;

    if (command == "exit")
    {
      break;
    }

    if (arg.empty())
    {
      std::cout << "Usage: lookup <word> | correct <word> | "
                   "suggest <word> | exit\n";
      continue;
    }

    if (command == "lookup")
    {
      // time query
      auto start = std::chrono::high_resolution_clock::now();
      WordInfo info = dict.getWordInfo(arg);
      auto end = std::chrono::high_resolution_clock::now();
      std::chrono::duration<double, std::milli> elapsed = end - start;

      if (info.lemma.empty())
      {
        std::cout << "Word not found\n";
        continue;
      }

      printWordInfo(info);
      std::cout << "Database query executed in " << elapsed.count() << " milliseconds\n";
      continue;
    }

    if (command == "correct")
    {
      const std::string correction = checker.correct(arg);
      if (correction.empty())
      {
        std::cout << "No suggestions found.\n";
        continue;
      }

      std::cout << "Did you mean " << correction << "?\n";
      continue;
    }

    if (command == "suggest")
    {
      checker.dumpList(checker.suggest(arg));
      continue;
    }

    std::cout << "Unknown command. Use: lookup <word> | correct "
                 "<word> | "
                 "suggest <word> | exit\n";
  }
#endif
// basic HTTP TCP server build
#if 0
	int serverSocket = socket(AF_INET, SOCK_STREAM, 0);

	sockaddr_in serverAddress{};
	serverAddress.sin_family = AF_INET;
	serverAddress.sin_port = htons(8080);
	serverAddress.sin_addr.s_addr = INADDR_ANY;

	bind(serverSocket, (struct sockaddr*)&serverAddress, sizeof(serverAddress));
	listen(serverSocket, 5);

	while (true)
	{
		int clientSocket = accept(serverSocket, nullptr, nullptr);

		char buffer[2048] = {0};
		int n = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);
		if (n <= 0) { close(clientSocket); continue; }

		std::string request(buffer, n);
		std::istringstream iss(request);
		std::string method, target;
		iss >> method >> target;

		std::string word;
		auto qpos = target.find("?word=");
		if (qpos != std::string::npos) word = target.substr(qpos + 6);

		json body;
		int status = 200;
		std::string statusText = "OK";

		if (method != "GET" || target.rfind("/lookup", 0) != 0 || word.empty())
		{
			status = 400;
			statusText = "Bad Request";
			body = {{"error", "use /lookup?word=..."}};
		}
		else
		{
			WordInfo info = dict.getWordInfo(word);
			if (info.lemma.empty())
			{
				status = 404;
				statusText = "Not Found";
				body = {{"error", "word not found"}};
			}
			else
			{
				body = toJson(info);
			}
		}

		std::string out = body.dump();
		std::ostringstream response;
		response << "HTTP/1.1 " << status << " " << statusText << "\r\n";
		response << "Content-Type: application/json\r\n";
		response << "Content-Length: " << out.size() << "\r\n";
		response << "Connection: close\r\n\r\n";
		response << out;

		auto s = response.str();
		send(clientSocket, s.c_str(), s.size(), 0);
		close(clientSocket);
	}

	close(serverSocket);
#endif

  return 0;
}
