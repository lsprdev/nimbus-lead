package main

import (
	"log"

	"leads-finder/internal/backend"
	_ "leads-finder/migrations"

	"github.com/joho/godotenv"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
)

func main() {
	_ = godotenv.Load()

	app := pocketbase.New()

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: true,
	})

	backend.Register(app)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
