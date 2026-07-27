package ods.alpha;

/** F6: test-only call site — must not yield DoD production calls. */
public class ServiceTest {
  public void testCreate() {
    new Service(new SystemClock()).create();
  }
}
