export const samples = [
{id:'factorial',name:'factorial.py',topic:'Functions',code:`def factorial(n):
    result = 1
    for i in range(1, n + 1):
        result *= i
    return result

print(factorial(5))`, summary:'This function multiplies the integers from 1 through n to calculate a factorial.',complexity:'O(n) time · O(1) auxiliary space',output:'120',lines:['Define a function with parameter n.','Start the running product at 1.','Visit every integer from 1 through n.','Multiply the running product by i.','Return the final product.','Blank line separates the function and its use.','Call factorial with 5, then print the result.']},
{id:'prime',name:'prime_checker.py',topic:'Conditionals',code:`number = 17
is_prime = number >= 2
for divisor in range(2, number):
    if number % divisor == 0:
        is_prime = False
        break
print(is_prime)`,summary:'Check whether 17 has a divisor between 2 and 16. A divisor would make it composite.',complexity:'O(n) time · O(1) space',output:'True',lines:['Choose 17.','Numbers below 2 are not prime.','Try potential divisors.','Test for a zero remainder.','Record that a divisor was found.','Stop searching.','Print the primality flag.']},
{id:'sort',name:'bubble_sort.py',topic:'Lists',code:`numbers = [5, 2, 4, 1]
for i in range(len(numbers)):
    for j in range(len(numbers) - i - 1):
        if numbers[j] > numbers[j + 1]:
            numbers[j], numbers[j + 1] = numbers[j + 1], numbers[j]
print(numbers)`,summary:'Compare adjacent values and swap out-of-order pairs. Each pass moves a large value to the end.',complexity:'O(n²) time · O(1) auxiliary space',output:'[1, 2, 4, 5]',lines:['Create the list.','Repeat a pass for each element.','Visit the unsorted adjacent pairs.','Check whether a pair is out of order.','Swap both values using tuple assignment.','Print the sorted list.']},
{id:'grades',name:'student_grades.py',topic:'Dictionaries',code:`marks = {"Asha": 86, "Ravi": 62, "Sara": 94}
for name, score in marks.items():
    if score >= 90:
        grade = "A"
    elif score >= 75:
        grade = "B"
    else:
        grade = "C"
    print(name, grade)`,summary:'Visit each student in a dictionary and assign a letter grade using score thresholds.',complexity:'O(n) time · O(1) auxiliary space',output:'Asha B\nRavi C\nSara A',lines:['Map names to scores.','Unpack each name and score.','Test the highest threshold.','Assign A.','Test the next threshold.','Assign B.','Handle remaining scores.','Assign C.','Print the name and grade.']},
{id:'fibonacci',name:'fibonacci.py',topic:'Loops',code:`a, b = 0, 1
for i in range(6):
    print(a)
    a, b = b, a + b`,summary:'Print six Fibonacci numbers. Each new number is the sum of the previous two.',complexity:'O(n) iterations · O(1) variables (integer sizes grow)',output:'0\n1\n1\n2\n3\n5',lines:['Initialize the first two Fibonacci values.','Repeat six times.','Print the current value.','Advance both values simultaneously.']}
];
