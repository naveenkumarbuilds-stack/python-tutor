"""Conservative dependency checks; these never evaluate expressions."""
import ast


def output_dependencies(source):
    tree = ast.parse(source)
    found = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            found.add('Imported modules or libraries may affect output')
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id == 'input': found.add('User input is required')
            if node.func.id == 'open': found.add('File contents or filesystem state are required')
            if node.func.id in ('eval','exec','__import__'): found.add('Dynamic code behavior cannot be predicted safely')
    return sorted(found)
