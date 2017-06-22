""" server.py """
from flask import (
    Flask,
    jsonify,
    render_template,
    request)

from flask_sqlalchemy import SQLAlchemy


app = Flask(__name__, static_url_path='')
app.config['SECRET_KEY'] = 'F34TF$($e34Dsd76fd7s3*sdjhf^&%$%^#';
app.debug = True

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://aaa:bbb@localhost/webdb'  # 'sqlite:///todos.db'
db = SQLAlchemy(app)


def init_db():
    db.drop_all()
    db.create_all()


class Todo(db.Model):
    __tablename__ = 'todos'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(128))
    order = db.Column(db.Integer)
    done = db.Column(db.Boolean)

    def to_json(self):
        return {
            "id": self.id,
            "title": self.title,
            "order": self.order,
            "done": self.done}

    def from_json(self, source):
        if 'title' in source:
            self.title = source['title']
        if 'order' in source:
            self.order = source['order']
        if 'done' in source:
            self.done = source['done']


@app.route('/')
def index():
    todos = Todo.query.all()
    todo_list = map(Todo.to_json, todos)
    return render_template('mytodo.html', todos=todo_list)


@app.route('/todos/', methods=['POST'])
def todo_create():
    todo = Todo()
    todo.from_json(request.get_json())
    db.session.add(todo)
    db.session.commit()
    return _todo_response(todo)


@app.route('/todos/<int:id>')
def todo_read(id):
    todo = _todo_get_or_404(id)
    return _todo_response(todo)


@app.route('/todos/<int:id>', methods=['PUT', 'PATCH'])
def todo_update(id):
    todo = Todo.query.get_or_404(id)
    todo.from_json(request.get_json())
    db.session.commit()
    return _todo_response(todo)


@app.route('/todos/<int:id>', methods=['DELETE'])
def todo_delete(id):
    Todo.query.filter_by(id=id).delete()
    db.session.commit()
    return jsonify()


def _todo_response(todo):
    '''print(todo.to_json())
    tt = Todo.query.all()
    for t in tt:
        print('id:{id}, todo:{tod}, done:{done};'.format(id=t.id, tod=t.title, done=t.done))'''
    return jsonify(**todo.to_json())


if __name__ == '__main__':
    init_db()
    app.run(port=5000)

