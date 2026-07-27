package ods.alpha;

/** F5: ambiguous overload — parses but does not uniquely resolve (null). */
public class Overloads {
  public void run() {
    foo(null);
  }

  public void foo(String value) {}

  public void foo(Integer value) {}
}
