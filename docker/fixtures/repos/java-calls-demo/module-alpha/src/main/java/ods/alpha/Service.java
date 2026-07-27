package ods.alpha;

/** F1: instance call create→save. F2: static Utils.stamp. F3: cross-module BetaHelper.help. F4: Clock.now via interface. */
public class Service {
  private final Clock clock;
  private final ods.beta.BetaHelper helper = new ods.beta.BetaHelper();

  public Service(Clock clock) {
    this.clock = clock;
  }

  public void create() {
    save();
    Utils.stamp();
    helper.help();
    clock.now();
  }

  private void save() {}
}
