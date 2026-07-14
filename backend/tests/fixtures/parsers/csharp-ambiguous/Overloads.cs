namespace Sample;

public class Overloads
{
    public void Run(int x) { }
    public void Run(string x) { }

    public void Call()
    {
        // Ambiguous without cast context for dynamic overload pick — use two-arg mismatch
        // CandidateSymbols for Run() with no args → multiple candidates
        Run();
    }
}
