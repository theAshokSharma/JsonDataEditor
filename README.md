## Example of Options.json 

```
{
  "age": {
    "values": ["0-10"],
    "response_type": "single-select"
  },
  "pain_level": {
    "values": ["Unknown/Unsure", "0-10"],
    "response_type": "single-select"
  },
  "satisfaction": {
    "values": ["1-5"],
    "na": "-1",
    "response_type": "single-select"
  }
}
```

#### Rendered drop down
    - Age: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    - Pain Level: [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    - Satisfaction: [1, 2, 3, 4, 5, Not Applicable]

#### Json Output
```
{
  "age": 5,
  "pain_level": -1,
  "satisfaction": "Not Applicable"
}
```

### date example
```
{
  "birth_year": {
    "values": ["Unknown/Unsure", "1920-2010"],
    "response_type": "single-select"
  },
  "graduation_year": {
    "values": ["1950-2024"],
    "response_type": "single-select"
  },
  "event_year": {
    "values": ["2000-2025"],
    "na": "Not Applicable",
    "response_type": "single-select"
  },
  "model_year": {
    "values": ["1980-2024"],
    "response_type": "single-select"
  }
}
```
#### How It Expands:

- "1920-2010" → [1920, 1921, 1922, ..., 2009, 2010] (91 values)
- "1950-2024" → [1950, 1951, 1952, ..., 2023, 2024] (75 values)
- "2000-2025" → [2000, 2001, 2002, ..., 2024, 2025] (26 values)

### dependent_values
```
"dependent_values": {
  "dependency_field_path": {
    "value1": ["option1", "option2"],
    "value2": ["option3", "option4"]
  }
}
```