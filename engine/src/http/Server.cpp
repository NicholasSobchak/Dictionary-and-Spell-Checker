#include "http/Server.h"
#include "http/routes/WordRoutes.h"
#include "logging.h"

#if __has_include(<crow.h>)
#include <crow.h>
#elif __has_include(<crow/crow.h>)
#include <crow/crow.h>
#else
#error "Crow headers not found (need crow.h or crow/crow.h)"
#endif

#include <signal.h>

namespace http
{
void runServer(const int port)
{
  signal(SIGPIPE, SIG_IGN);

  crow::SimpleApp app;
  registerWordRoutes(app);

  app.signal_clear().signal_add(SIGINT).signal_add(SIGTERM);
  app.port(port).concurrency(4).timeout(5).run();
}
} // end namespace http
