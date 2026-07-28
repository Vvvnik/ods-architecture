from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def home() -> str:
    return render_template("home.html")


@app.route("/ping", methods=["GET", "POST"])
def ping() -> str:
    return "pong"
