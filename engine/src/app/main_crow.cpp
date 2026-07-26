#include "app/Config.h"
#include "http/Server.h"
#include "http/services/WordService.h"
#include "logging.h"

int main()
{
  try
  {
    http::wordService().warmupDictionary();
    http::runServer(Config::getInstance().getServerPort());
    return 0;
  }
  catch (const std::exception &e)
  {
    CROW_LOG_ERROR << "Fatal error: " << e.what();
    return 1;
  }
  catch (...)
  {
    CROW_LOG_ERROR << "Fatal unknown error";
    return 1;
  }
}
