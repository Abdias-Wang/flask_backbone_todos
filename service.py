""" server.py """
from flask import (
    Flask,
    abort,
    jsonify,
    render_template,
    request)

TODOS = {}

app = Flask(__name__, static_url_path='')
app.debug = True


@app.route('/')
def index():
    # todos = filter(None, TODOS)
    return render_template('mytodo.html', todos=TODOS.values())


@app.route('/todos/', methods=['POST'])
def todo_create():
    print('called todo_create')
    todo = request.get_json()
    id = todo['order']
    todo['id'] = id
    TODOS[id] = todo
    return _todo_response(todo)


@app.route('/todos/<int:id>')
def todo_read(id):
    todo = _todo_get_or_404(id)
    return _todo_response(todo)


@app.route('/todos/<int:id>', methods=['PUT', 'PATCH'])
def todo_update(id):
    todo = _todo_get_or_404(id)
    updates = request.get_json()
    todo.update(updates)
    return _todo_response(todo)


@app.route('/todos/<int:id>', methods=['DELETE'])
def todo_delete(id):
    todo = _todo_get_or_404(id)
    TODOS.pop(id)
    return _todo_response(todo)


def _todo_get_or_404(id):
    if id in TODOS:
        todo = TODOS[id]
    else:
        abort(404)
    return todo


def _todo_response(todo):
    print(TODOS)
    return jsonify(**todo)


if __name__ == '__main__':
    app.run(port=5000)
