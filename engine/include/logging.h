#ifndef LOGGING_H
#define LOGGING_H

#if __has_include(<crow.h>)
#include <crow.h>
#elif __has_include(<crow/crow.h>)
#include <crow/crow.h>
#else
#error "Crow headers not found"
#endif

#endif // LOGGING_H
