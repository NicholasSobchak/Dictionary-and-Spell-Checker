#ifndef HTTP_DTO_WORDRESPONSE_H
#define HTTP_DTO_WORDRESPONSE_H

#include <string>

#include "dct/WordInfo.h"

namespace http
{
// maps WordInfo to JSON response payload.
// `query` echoes the user's raw input (with punctuation preserved) when
// provided.
std::string toWordJson(
    const WordInfo &info,
    const std::string &query = "",
    const std::vector<std::string> &alternativeSearches = {});
} // end namespace http

#endif // HTTP_DTO_WORDRESPONSE_H
