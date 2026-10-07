import argparse

from .database import Base, SessionLocal, engine
from .ingestion import ingest_affiliations, ingest_senators, ingest_votes
from .metrics import refresh_snapshots
from .tse import ingest_tse_elections


def main() -> None:
    parser = argparse.ArgumentParser(prog="votosdosenado")
    subparsers = parser.add_subparsers(dest="command", required=True)
    ingest = subparsers.add_parser("ingest")
    ingest.add_argument("--senators", action="store_true")
    ingest.add_argument("--votes", action="store_true")
    ingest.add_argument("--profiles", action="store_true")
    subparsers.add_parser("metrics")
    elections = subparsers.add_parser("elections")
    elections.add_argument("--years", nargs="+", type=int, default=[2018, 2022])
    args = parser.parse_args()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        if args.command == "ingest":
            do_all = not args.senators and not args.votes and not args.profiles
            if args.senators or do_all:
                print(f"Senadores importados: {ingest_senators(session)}")
            if args.votes or do_all:
                votings, votes = ingest_votes(session)
                print(f"Votações importadas: {votings}; votos: {votes}")
            if args.profiles or do_all:
                print(f"Filiações importadas: {ingest_affiliations(session)}")
            print(f"Índices atualizados: {refresh_snapshots(session)}")
        elif args.command == "metrics":
            print(f"Índices atualizados: {refresh_snapshots(session)}")
        elif args.command == "elections":
            for year, count in ingest_tse_elections(session, tuple(args.years)).items():
                print(f"Resultados eleitorais {year}: {count}")


if __name__ == "__main__":
    main()
