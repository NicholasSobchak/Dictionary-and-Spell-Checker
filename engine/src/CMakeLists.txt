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
    Threads::Threads
)

set_target_properties(quickquill_core PROPERTIES POSITION_INDEPENDENT_CODE ON)

add_library(quickquill_http STATIC
    http/services/WordService.cpp
    http/dto/WordResponse.cpp
)

target_link_libraries(quickquill_http PUBLIC
    quickquill_core
)

set_target_properties(quickquill_http PROPERTIES POSITION_INDEPENDENT_CODE ON)

# --- Shared Library for FFM ---
# This builds libquickquill_engine.so — a C ABI wrapper around the C++ engine
# that Java can call via the Foreign Function and Memory API (Panama FFM).

add_library(quickquill_engine SHARED
    ../native/quickquill.cpp
)

target_include_directories(quickquill_engine PRIVATE
    ../native
    ../include
    ../utils
)

target_link_libraries(quickquill_engine PRIVATE
    quickquill_http
    quickquill_core
    nlohmann_json::nlohmann_json
)

# System.loadLibrary("quickquill_engine") looks for libquickquill_engine.so on Linux,
# so keep the default "lib" prefix.
set_target_properties(quickquill_engine PROPERTIES
    POSITION_INDEPENDENT_CODE ON
)
