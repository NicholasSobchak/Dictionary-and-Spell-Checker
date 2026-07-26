#ifndef HTTP_ROUTES_WORDROUTES_H
#define HTTP_ROUTES_WORDROUTES_H

#if __has_include(<crow.h>)
#include <crow.h>
#elif __has_include(<crow/crow.h>)
#include <crow/crow.h>
#else
#error "Crow headers not found (need crow.h or crow/crow.h)"
#endif

namespace http
{
void registerWordRoutes(crow::SimpleApp &app);
} // end namespace http

#endif // HTTP_ROUTES_WORDROUTES_H
