var app = app || {};
var ENTER_KEY = 13;
var ESC_KEY = 27;

// Load the application once the DOM is ready, using `jQuery.ready`:
$(function () {

    // Todo Model
    // ----------

    // Our basic **Todo** model has `title`, `id`, and `done` attributes.
    app.Todo = Backbone.Model.extend({
        // Default attributes for the todo item.
        defaults: function () {
            return {
                title: "empty todo...",
                order: app.todos.nextOrder(),
                done: false
            };
        },

        // Toggle the `done` state of this todo item.
        toggle: function () {
            this.save({done: !this.get("done")});
        }

    });

    // Todo Collection
    // ---------------

    // The collection of todos is backed by *localStorage* instead of a remote
    // server.
    var TodoList = Backbone.Collection.extend({

        // Reference to this collection's model.
        model: app.Todo,

        // Save all of the todo items under the `"todos-backbone"` namespace.
        //localStorage: new Backbone.LocalStorage("todos-backbone"),

        // Filter down the list of all todo items that are finished.
        done: function () {
            return this.where({done: true});
        },

        // Filter down the list to only todo items that are still not finished.
        remaining: function () {
            return this.where({done: false});
        },

        // We keep the Todos in sequential order, despite being saved by unordered
        // GUID in the database. This generates the next order number for new items.
        nextOrder: function () {
            return this.length ? this.last().get('order') + 1 : 1;
        },

        // Todos are sorted by their original insertion order.
        comparator: 'order'

    });

    // Create our global collection of **Todos**.
    app.todos = new TodoList();

    // Todo Item View
    // --------------

    // The DOM element for a todo item...
    app.TodoView = Backbone.View.extend({

        //... is a list tag.
        tagName: "li",

        // Cache the template function for a single item.
        template: _.template($('#item-template').html()),

        // The DOM events specific to an item.
        events: {
            "click .toggle": "toggleDone",
            "dblclick .item-view": "edit",
            "click .destroy": "clear",
            "keypress .edit": "updateOnEnter",
            "keydown .edit": "revertOnEscape",
            "blur .edit": "close"
        },

        // The TodoView listens for changes to its model, re-rendering. Since there's
        // a one-to-one correspondence between a **Todo** and a **TodoView** in this
        // app, we set a direct reference on the model for convenience.
        initialize: function () {
            //this.model.bind('change', _.bind(this.render, this));
            //this.model.bind('destroy', _.bind(this.remove, this));
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'destroy', this.remove);
            this.listenTo(this.model, 'visible', this.toggleVisible);
        },

        // Re-render the titles of the todo item.
        render: function () {
            //console.log('render called by No. '+ this.model.order);
            this.$el.html(this.template(this.model.toJSON()));
            this.$el.toggleClass('done', this.model.get('done'));
            this.input = this.$('.edit');  // just a private var to store the dom of .edit class
            return this;
        },

        toggleVisible: function () {
            this.$el.toggleClass('hidden', this.isHidden());
        },

        isHidden: function () {
            return this.model.get('done') ?
            app.TodoFilter === 'active' :
            app.TodoFilter === 'completed';
        },

        // Toggle the `"done"` state of the model.
        toggleDone: function () {
            this.model.toggle();
        },

        // Switch this view into `"editing"` mode, displaying the input field.
        edit: function () {
            this.$el.addClass("editing");
            //this.input.focus();
        },

        // Close the `"editing"` mode, saving changes to the todo.
        close: function () {
            var value = this.input.val();   // this.$('.edit').val;
            if (!value) {
                this.clear();
            } else {
                this.model.save({title: value});
                this.$el.removeClass("editing");
            }
        },

        // If you hit `enter`, we're through editing the item.
        updateOnEnter: function (e) {
            if (e.keyCode == 13) this.close();
        },

        revertOnEscape: function (e) {
            if (e.which === ESC_KEY) {
                this.$el.removeClass('editing');
                // Also reset the hidden input back to the original value.
                this.input.val(this.model.get('title'));
            }
        },

        // Remove the item, destroy the model.
        clear: function () {
            this.model.destroy();
        }

    });

    // The Application
    // ---------------

    // Our overall **AppView** is the top-level piece of UI.
    app.AppView = Backbone.View.extend({

        // Instead of generating a new element, bind to the existing skeleton of
        // the App already present in the HTML.
        el: '.todoapp',

        // Our template for the line of statistics at the bottom of the app.
        statsTemplate: _.template($('#stats-template').html()),

        // Delegated events for creating new items, and clearing completed ones.
        events: {
            "keypress .new-todo": "createOnEnter",
            "click .clear-completed": "clearCompleted",
            "click .toggle-all": "toggleAllComplete"
        },

        // At initialization we bind to the relevant events on the `Todos`
        // collection, when items are added or changed. Kick things off by
        // loading any preexisting todos that might be saved in *localStorage*.
        initialize: function () {

            this.allCheckbox = this.$('.toggle-all')[0];
            this.input = this.$('.new-todo');
            this.footer = this.$('.footer');
            this.main = this.$('.main');
            this.list = $('.todo-list');

            this.listenTo(app.todos, 'add', this.addOne);
            this.listenTo(app.todos, 'reset', this.addAll);
            this.listenTo(app.todos, 'change:completed', this.filterOne);
            this.listenTo(app.todos, 'filter', this.filterAll);
            this.listenTo(app.todos, 'all', _.debounce(this.render, 0));  // what is all event?

            //app.todos.fetch(); //-- if fetch from local storage, do not need url? ???????????????????????????????
        },

        // Re-rendering the App just means refreshing the statistics -- the rest
        // of the app doesn't change.
        render: function () {
            var done = app.todos.done().length;
            var remaining = app.todos.remaining().length;

            if (app.todos.length) {
                this.main.show();
                this.footer.show();
                this.footer.html(this.statsTemplate({done: done, remaining: remaining}));
                this.$('.filters li a')
                    .removeClass('selected')
                    .filter('[href="#/' + (app.TodoFilter || '') + '"]')
                    .addClass('selected'); // ---- fine, this is just jquery filter and add class ?????????????????????
            } else {
                this.main.hide();
                this.footer.hide();
            }

            this.allCheckbox.checked = !remaining;
        },

        // Add a single todo item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOne: function (todo) {
            var view = new app.TodoView({model: todo});
            this.list.append(view.render().el);
        },

        // Add all items in the **Todos** collection at once.
        addAll: function () {
            this.list.html('');
            app.todos.each(this.addOne, this);
        },


        filterOne: function (todo) {
            todo.trigger('visible');
        },

        filterAll: function () {
            app.todos.each(this.filterOne, this);
        },

        // If you hit return in the main input field, create new **Todo** model,
        // persisting it to *localStorage*.

        newAttributes: function () {
            return {
                title: this.input.val().trim(),
                order: app.todos.nextOrder(),
                done: false
            };
        },

        createOnEnter: function (e) {
            if (e.which === ENTER_KEY && this.input.val().trim()) {
                console.log('create a new entry');
                console.log(this.newAttributes());
                app.todos.create(this.newAttributes());
                this.input.val('');
            }
        },

        // Clear all done todo items, destroying their models.
        clearCompleted: function () {
            _.invoke(app.todos.done(), 'destroy');
            return false;
        },

        toggleAllComplete: function () {
            var done = this.allCheckbox.checked;
            app.todos.each(function (todo) {
                todo.save({'done': done});
            });
        }

    });

    new app.AppView();

    var TodoRouter = Backbone.Router.extend({
        routes: {
            '*filter': 'setFilter'
        },

        setFilter: function (param) {
            // Set the current filter to be used
            app.TodoFilter = param || '';

            // Trigger a collection filter event, causing hiding/unhiding
            // of Todo view items
            app.todos.trigger('filter');
        }
    });

    app.TodoRouter = new TodoRouter();
    Backbone.history.start();

});
