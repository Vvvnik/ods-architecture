namespace Sample;

public class Service
{
    private readonly Repo _repo;

    public Service(Repo repo)
    {
        _repo = repo;
    }

    public void Create()
    {
        _repo.Save();
    }
}
