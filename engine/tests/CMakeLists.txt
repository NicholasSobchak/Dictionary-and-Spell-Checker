find_package(Catch2 REQUIRED)
include(Catch)

add_executable(runTests
    integration/WordApiIntegration.cpp
    unit/TrieTests.cpp
	unit/DictionaryTests.cpp
    unit/DictionaryConcurrencyTests.cpp
	unit/DatabaseTests.cpp
	unit/SpellCheckerTests.cpp
)

target_include_directories(runTests PRIVATE
    ../utils/tests
)

target_link_libraries(runTests PRIVATE
    Catch2::Catch2WithMain
    quickquill_core
    quickquill_http
)

# Register tests with CTest via Catch2
catch_discover_tests(runTests)
