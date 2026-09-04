cmake_minimum_required(VERSION 3.16)
project(QuickQuill LANGUAGES CXX)

# Enable clang-tidy
find_program(CLANG_TIDY clang-tidy)
if(CLANG_TIDY)
  set(CMAKE_CXX_CLANG_TIDY "${CLANG_TIDY}")
endif()

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# find system libraries
find_package(nlohmann_json 3.2.0 CONFIG REQUIRED)
find_package(unofficial-sqlite3 CONFIG REQUIRED)
find_package(Threads REQUIRED)

add_subdirectory(src)

# Tests
enable_testing()
add_subdirectory(tests)
