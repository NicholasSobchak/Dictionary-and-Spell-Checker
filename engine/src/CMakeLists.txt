add_library(quickquill_core STATIC
    app/Config.cpp
    core/Dictionary.cpp
    core/SpellChecker.cpp
    core/Trie.cpp
    data/Database.cpp
)

target_include_directories(quickquill_core PUBLIC
    ../include
    ../utils
)

target_link_libraries(quickquill_core PUBLIC
    nlohmann_json::nlohmann_json
    unofficial::sqlite3::sqlite3
)

add_library(quickquill_http STATIC
    http/Server.cpp
    http/routes/WordRoutes.cpp
    http/services/WordService.cpp
    http/dto/WordResponse.cpp
)

target_link_libraries(quickquill_http PUBLIC
    quickquill_core
    Crow::Crow
    Threads::Threads
)

# --- Console Application ---
add_executable(dict
    app/main.cpp
)

target_link_libraries(dict PRIVATE
    quickquill_core
)

# --- Web Application ---
add_executable(dict_crow
    app/main_crow.cpp
)

target_link_libraries(dict_crow PRIVATE
    quickquill_http
)

# Define the static file directory for Crow at compile time
target_compile_definitions(dict_crow PRIVATE
    CROW_STATIC_DIR="${CMAKE_SOURCE_DIR}/web"
)
