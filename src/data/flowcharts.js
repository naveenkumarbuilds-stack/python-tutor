export const flowcharts = {
factorial:'flowchart TD\n A([Start]) --> B[result = 1]\n B --> C{More integers from 1 to n?}\n C -->|Yes| D[result = result × i]\n D --> C\n C -->|No| E[Return result]\n E --> F([End])',
prime:'flowchart TD\n A([Start]) --> B[Set number and initial flag]\n B --> C{More divisors?}\n C -->|Yes| D{Remainder is zero?}\n D -->|Yes| E[Set false and break]\n D -->|No| C\n E --> F[Print flag]\n C -->|No| F',
sort:'flowchart TD\n A[Start pass] --> B{More pairs?}\n B -->|Yes| C{Left greater than right?}\n C -->|Yes| D[Swap pair]\n D --> B\n C -->|No| B\n B -->|No| E{More passes?}\n E -->|Yes| A\n E -->|No| F[Print sorted list]',
grades:'flowchart TD\n A[Next student] --> B{Score at least 90?}\n B -->|Yes| C[Grade A]\n B -->|No| D{Score at least 75?}\n D -->|Yes| E[Grade B]\n D -->|No| F[Grade C]\n C --> G[Print name and grade]\n E --> G\n F --> G',
fibonacci:'flowchart TD\n A[Set a = 0 and b = 1] --> B{More iterations?}\n B -->|Yes| C[Print a]\n C --> D[Update a and b]\n D --> B\n B -->|No| E([End])'};
