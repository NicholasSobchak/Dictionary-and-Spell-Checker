#include "http/routes/WordRoutes.h"
#include "http/services/WordService.h"

#include <cctype>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>

namespace http
{
namespace
{
const std::string kDistRoot = "web/dist/web/browser";
const std::string kAssetsRoot = kDistRoot + "/assets/";

namespace fs = std::filesystem;

/**
 * Type safety: wrapper carrying a MIME type string
 */
struct ContentType
{
  std::string value;
  explicit ContentType(std::string v) : value(std::move(v)) {}
};

crow::response jsonResponse(const std::string &body, int status = 200)
{
  crow::response response(status, body);
  response.set_header("Content-Type", "application/json");
  return response;
}

crow::response htmlResponseFromFile(const std::string &path)
{
  std::ifstream file(path);
  if (!file)
  {
    return crow::response(500, "Failed to load frontend HTML.");
  }

  std::ostringstream ss;
  ss << file.rdbuf();
  crow::response response(200, ss.str());
  response.set_header("Content-Type", "text/html; charset=utf-8");
  return response;
}

std::string guessContentType(const std::string &path)
{
  static const std::vector<std::pair<std::string, std::string>> mapping = {
      {".html", "text/html; charset=utf-8"},
      {".js", "application/javascript"},
      {".css", "text/css; charset=utf-8"},
      {".png", "image/png"},
      {".jpg", "image/jpeg"},
      {".jpeg", "image/jpeg"},
      {".svg", "image/svg+xml"},
      {".gif", "image/gif"},
      {".webp", "image/webp"},
      {".woff2", "font/woff2"},
      {".woff", "font/woff"},
      {".ttf", "font/ttf"},
      {".otf", "font/otf"},
  };

  for (const auto &[ext, mime] : mapping)
  {
    if (path.size() >= ext.size() && path.compare(path.size() - ext.size(), ext.size(), ext) == 0)
    {
      return mime;
    }
  }
  return "application/octet-stream";
}

crow::response fileResponseFromFile(const std::string &path, const ContentType &contentType)
{
  std::ifstream file(path, std::ios::binary);
  if (!file)
  {
    return crow::response(404, "File not found.");
  }

  std::ostringstream ss;
  ss << file.rdbuf();
  crow::response response(200, ss.str());
  response.set_header("Content-Type", contentType.value);
  return response;
}

std::string decodeUrlComponent(const std::string &in)
{
  std::string out;
  out.reserve(in.size());

  for (size_t i = 0; i < in.size(); ++i)
  {
    if (in[i] == '%')
    {
      if (i + 2 >= in.size())
      {
        return "";
      }

      const auto hex = in.substr(i + 1, 2);
      char *end = nullptr;
      const long val = std::strtol(hex.c_str(), &end, 16);
      if (end != hex.c_str() + 2)
      {
        return "";
      }

      out.push_back(static_cast<char>(val));
      i += 2;
    }
    else if (in[i] == '+')
    {
      out.push_back(' ');
    }
    else
    {
      out.push_back(in[i]);
    }
  }

  return out;
}

bool isAllowedAssetPathChar(unsigned char c)
{
  return std::isalnum(c) != 0 || c == '_' || c == '-' || c == '.' || c == '/' || c == '@';
}

bool isSafeAssetPath(const std::string &path)
{
  if (path.empty() || path.size() > 512)
  {
    return false;
  }

  // disallow absolute paths and windows separators
  if (path.front() == '/' || path.front() == '\\')
  {
    return false;
  }
  if (path.find('\\') != std::string::npos)
  {
    return false;
  }

  // character allow-list
  for (unsigned char c : path)
  {
    if (!isAllowedAssetPathChar(c))
    {
      return false;
    }
  }

  // segment validation: reject empty segments and "." / ".."
  size_t start = 0;
  while (start < path.size())
  {
    const size_t slash = path.find('/', start);
    const size_t end = (slash == std::string::npos) ? path.size() : slash;
    if (end == start)
    {
      return false;
    }

    const std::string_view seg(path.data() + start, end - start);
    if (seg == "." || seg == "..")
    {
      return false;
    }

    start = (slash == std::string::npos) ? path.size() : slash + 1;
  }

  return true;
}

bool isUnderRoot(const fs::path &root, const fs::path &candidate)
{
  const fs::path r = root.lexically_normal();
  const fs::path c = candidate.lexically_normal();

  auto rIt = r.begin();
  auto cIt = c.begin();
  for (; rIt != r.end() && cIt != c.end(); ++rIt, ++cIt)
  {
    if (*rIt != *cIt)
    {
      return false;
    }
  }

  return rIt == r.end();
}
} // end namespace

/**
 * Requests
 */
void registerWordRoutes(crow::SimpleApp &app)
{
  // static frontend from Angular build (web/dist/web/browser)
  CROW_ROUTE(app, "/")
  ([] { return htmlResponseFromFile(kDistRoot + "/index.html"); });

  // SPA fallback routes — serve index.html for client-side routing
  CROW_ROUTE(app, "/search-history")
  ([] { return htmlResponseFromFile(kDistRoot + "/index.html"); });

  CROW_ROUTE(app, "/suggestions")
  ([] { return htmlResponseFromFile(kDistRoot + "/index.html"); });

  // Serve root-level static files (JS bundles, CSS, favicon)
  CROW_ROUTE(app, "/<string>")
  (
      [](const std::string &path)
      {
        const fs::path root = fs::weakly_canonical(kDistRoot);
        const fs::path candidate = fs::weakly_canonical(root / fs::path(path));
        if (!isUnderRoot(root, candidate) || !fs::is_regular_file(candidate))
        {
          // Unknown path — fall back to index.html for SPA routing
          return htmlResponseFromFile(kDistRoot + "/index.html");
        }
        const std::string full = candidate.string();
        const auto mime = guessContentType(full);
        return fileResponseFromFile(full, ContentType(mime));
      });

  // Serve hashed assets (and public assets) with a catch-all in /assets/
  CROW_ROUTE(app, "/assets/<path>")
  (
      [](const std::string &path)
      {
        const std::string decoded = decodeUrlComponent(path);
        if (decoded.empty() || !isSafeAssetPath(decoded))
        {
          return crow::response(400, "Invalid asset path.");
        }

        const fs::path root = fs::weakly_canonical(kAssetsRoot);
        const fs::path candidate = fs::weakly_canonical(root / fs::path(decoded));
        if (!isUnderRoot(root, candidate))
        {
          return crow::response(400, "Invalid asset path.");
        }

        const std::string full = candidate.string();
        const auto mime = guessContentType(full);
        return fileResponseFromFile(full, ContentType(mime));
      });

  /**
   * GET requests
   */
  CROW_ROUTE(app, "/api/health")
  ([] { return jsonResponse("{\"ok\":true}"); });

  CROW_ROUTE(app, "/api/word/")
  ([] { return jsonResponse("{\"error\":\"Enter a valid word\"}", 400); });

  CROW_ROUTE(app, "/api/word/<string>")
  (
      [](const std::string &word)
      {
        auto result = wordService().search(word);
        return jsonResponse(result.body, result.status);
      });

  CROW_ROUTE(app, "/api/suggest/<string>")
  (
      [](const std::string &word)
      {
        auto result = wordService().suggest(word);
        return jsonResponse(result.body, result.status);
      });

  CROW_ROUTE(app, "/api/synonym/<string>")
  (
      [](const std::string &word)
      {
        const auto res = wordService().suggestSynonym(word);
        return jsonResponse(res.body, res.status);
      });

  CROW_ROUTE(app, "/api/autofill/<string>")
  (
      [](const crow::request &req, const std::string &word)
      {
        std::vector<std::string> history;
        std::vector<std::string> suggested;

        if (const char *h = req.url_params.get("history"))
        {
          std::string hstr(h);
          std::istringstream ss(hstr);
          std::string item;
          while (std::getline(ss, item, ','))
          {
            if (!item.empty())
            {
              history.push_back(std::move(item));
            }
          }
        }

        if (const char *s = req.url_params.get("suggested"))
        {
          std::string sstr(s);
          std::istringstream ss(sstr);
          std::string item;
          while (std::getline(ss, item, ','))
          {
            if (!item.empty())
            {
              suggested.push_back(std::move(item));
            }
          }
        }

        auto result = wordService().autofill(word, history, suggested);
        return jsonResponse(result.body, result.status);
      });
}
} // end namespace http
